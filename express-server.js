import 'dotenv/config';

import {createRequestHandler} from '@remix-run/express';
import {installGlobals} from '@remix-run/node';
import {
  cartGetIdDefault,
  cartSetIdDefault,
  createCartHandler,
  createCustomerAccountClient,
  createStorefrontClient,
  InMemoryCache,
} from '@shopify/hydrogen';
import {createCookieSessionStorage} from '@shopify/remix-oxygen';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/cart
export const CART_QUERY_FRAGMENT = `#graphql
  fragment Money on MoneyV2 {
    currencyCode
    amount
  }
  fragment CartLine on CartLine {
    id
    quantity
    attributes {
      key
      value
    }
    cost {
      totalAmount {
        ...Money
      }
      amountPerQuantity {
        ...Money
      }
      compareAtAmountPerQuantity {
        ...Money
      }
    }
    merchandise {
      ... on ProductVariant {
        id
        availableForSale
        compareAtPrice {
          ...Money
        }
        price {
          ...Money
        }
        requiresShipping
        title
        image {
          id
          url
          altText
          width
          height

        }
        product {
          handle
          title
          id
          vendor
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
  fragment CartApiQuery on Cart {
    updatedAt
    id
    checkoutUrl
    totalQuantity
    buyerIdentity {
      countryCode
      customer {
        id
        email
        firstName
        lastName
        displayName
      }
      email
      phone
    }
    lines(first: $numCartLines) {
      nodes {
        ...CartLine
      }
    }
    cost {
      subtotalAmount {
        ...Money
      }
      totalAmount {
        ...Money
      }
      totalDutyAmount {
        ...Money
      }
      totalTaxAmount {
        ...Money
      }
    }
    note
    attributes {
      key
      value
    }
    discountCodes {
      code
      applicable
    }
  }
`;

installGlobals();

const viteDevServer =
  process.env.NODE_ENV === 'production'
    ? undefined
    : await import('vite').then((vite) =>
        vite.createServer({
          server: {middlewareMode: true},
        }),
      );

const remixHandler = createRequestHandler({
  build: viteDevServer
    ? () => viteDevServer.ssrLoadModule('virtual:remix/server-build')
    : await import('./build/server/index.js'),
  async getLoadContext(request, response) {
    let env = process.env;
    let cache = new InMemoryCache();
    let session = AppSession.init(request, [env.SESSION_SECRET]);
    let waitUntil = () => {};

    request.url =
      request.protocol + '://' + request.get('host') + request.originalUrl;
    /**
     * Create Hydrogen's Storefront client.
     */
    const {storefront} = createStorefrontClient({
      cache,
      waitUntil,
      i18n: getLocaleFromRequest(request),
      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
      storeDomain: env.PUBLIC_STORE_DOMAIN,
      storefrontId: env.PUBLIC_STOREFRONT_ID,
      storefrontHeaders: {
        // Pass a buyerIp to prevent being flagged as a bot
        buyerIp: 'customer_IP_address', // Platform-specific method to get request IP
        // cookie: request.headers.get('cookie'), // Required for Shopify Analytics
        // purpose: request.headers.get('purpose'), // Used for debugging purposes
      },
    });
    /**
     * Create a client for Customer Account API.
     */
    const customerAccount = createCustomerAccountClient({
      waitUntil,
      request,
      session,
      customerAccountId: env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
      customerAccountUrl: env.PUBLIC_CUSTOMER_ACCOUNT_API_URL,
    });
    /*
     * Create a cart handler that will be used to
     * create and update the cart in the session.
     */
    const cart = createCartHandler({
      storefront,
      customerAccount,
      getCartId: cartGetIdDefault(request.headers),
      setCartId: cartSetIdDefault(),
      cartQueryFragment: CART_QUERY_FRAGMENT,
    });
    return {storefront, session, cache, customerAccount, cart};
  },
});

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable('x-powered-by');

// handle asset requests
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  // Vite fingerprints its assets so we can cache forever.
  app.use(
    '/assets',
    express.static('build/client/assets', {immutable: true, maxAge: '1y'}),
  );
}

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static('build/client', {maxAge: '1h'}));

app.use(morgan('tiny'));

// handle SSR requests
app.all('*', remixHandler);

const port = process.env.PORT || 3456;
app.listen(port, () =>
  console.log(`Express server listening at http://localhost:${port}`),
);
export class AppSession {
  #sessionStorage;
  #session;

  constructor(sessionStorage, session) {
    this.#sessionStorage = sessionStorage;
    this.#session = session;
  }

  static async init(request, secrets) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: 'session',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets,
      },
    });

    const session = await storage
      .getSession(request.headers.cookies)
      .catch(() => storage.getSession());

    return new this(storage, session);
  }

  get has() {
    return this.#session.has;
  }

  get get() {
    return this.#session.get;
  }

  get flash() {
    return this.#session.flash;
  }

  get unset() {
    return this.#session.unset;
  }

  get set() {
    return this.#session.set;
  }

  destroy() {
    return this.#sessionStorage.destroySession(this.#session);
  }

  commit() {
    return this.#sessionStorage.commitSession(this.#session);
  }
}
function getLocaleFromRequest(request) {
  const url = new URL(request.url);
  const firstPathPart = url.pathname.split('/')[1]?.toUpperCase() ?? '';

  let pathPrefix = '';
  let [language, country] = ['EN', 'US'];

  if (/^[A-Z]{2}-[A-Z]{2}$/i.test(firstPathPart)) {
    pathPrefix = '/' + firstPathPart;
    [language, country] = firstPathPart.split('-');
  }

  return {language, country, pathPrefix};
}
