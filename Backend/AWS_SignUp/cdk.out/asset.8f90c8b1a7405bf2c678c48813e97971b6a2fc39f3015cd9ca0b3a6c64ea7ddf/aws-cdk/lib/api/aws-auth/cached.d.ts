/**
 * Cache the result of a function on an object
 *
 * We could have used @decorators to make this nicer but we don't use them anywhere yet,
 * so let's keep it simple and readable.
 */
export declare function cached<A extends object, B>(obj: A, sym: symbol, fn: () => B): B;
/**
 * Like 'cached', but async
 */
export declare function cachedAsync<A extends object, B>(obj: A, sym: symbol, fn: () => Promise<B>): Promise<B>;
