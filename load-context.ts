import {type AppLoadContext, getStorefrontHeaders} from '@shopify/remix-oxygen';
import {type PlatformProxy} from 'wrangler';
import {AppSession} from './app/lib/session';
import {
  cartGetIdDefault,
  cartSetIdDefault,
  createCartHandler,
  createCustomerAccountClient,
  createStorefrontClient,
} from '@shopify/hydrogen';
import {CART_QUERY_FRAGMENT} from './app/lib/fragments';
import {createWeaverseClient} from './app/weaverse/create-weaverse.server';

// When using `wrangler.toml` to configure bindings,
// `wrangler types` will generate types for those bindings
// into the global `Env` interface.
// Need this empty interface so that typechecking passes
// even if no `wrangler.toml` exists.

type Cloudflare = Omit<PlatformProxy<Env>, 'dispose'>;

// declare module '@remix-run/cloudflare' {
//   interface AppLoadContext {
//     cloudflare: Cloudflare;
//   }
// }

type GetLoadContext = (args: {
  request: Request;
  context: {cloudflare: Cloudflare}; // load context _before_ augmentation
}) => Promise<AppLoadContext>;

// Shared implementation compatible with Vite, Wrangler, and Cloudflare Pages
export const getLoadContext: GetLoadContext = async ({context, request}) => {
  let {env, ctx, caches} = context.cloudflare;
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }
  const waitUntil = ctx.waitUntil.bind(ctx);
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET]),
  ]);

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
    storefrontHeaders: getStorefrontHeaders(request),
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

  /**
   * Create a Weaverse client
   */
  const weaverse = createWeaverseClient({
    storefront,
    request,
    env,
    cache,
    waitUntil,
  });

  return {
    ...context,
    session,
    storefront,
    customerAccount,
    cart,
    env,
    waitUntil,
    weaverse,
  };
};

function getLocaleFromRequest(request: Request): I18nLocale {
  const url = new URL(request.url);
  const firstPathPart = url.pathname.split('/')[1]?.toUpperCase() ?? '';

  type I18nFromUrl = [I18nLocale['language'], I18nLocale['country']];

  let pathPrefix = '';
  let [language, country]: I18nFromUrl = ['EN', 'US'];

  if (/^[A-Z]{2}-[A-Z]{2}$/i.test(firstPathPart)) {
    pathPrefix = '/' + firstPathPart;
    [language, country] = firstPathPart.split('-') as I18nFromUrl;
  }

  return {language, country, pathPrefix};
}
