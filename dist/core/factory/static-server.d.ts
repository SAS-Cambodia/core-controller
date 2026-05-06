import { Options, OptionsJson, OptionsUrlencoded, OptionsText } from 'body-parser';
import { CorsOptions, CorsOptionsDelegate } from "cors";
import { serverOptions } from "./index";
import { Options as RateOptions } from "express-rate-limit";
import { ProviderTarget } from "../../type";
export declare class CoreApplication {
    private options;
    server: import("express-serve-static-core").Express;
    private corsOptions;
    private interceptorsBefore;
    private interceptorsAfter;
    private interceptorError;
    private socketServer;
    private rateLimitOptions?;
    private middlewares;
    private prefix?;
    private excludePrefix?;
    private readonly controllerClasses;
    private readonly httpServer;
    private readonly providers?;
    private readonly appContext;
    constructor(options: serverOptions);
    /**
     * Registers global middleware functions to be used by the application.
     * Each middleware is instantiated and added to the middleware stack if it meets the criteria.
     *
     * @param middlewares - A list of middleware classes to be instantiated and used globally.
     * Each middleware should be a class that can be instantiated.
     */
    useGlobalMiddleware(...middlewares: any[]): void;
    /**
     * Retrieves an instance of the given provider target from the container.
     *
     * @param {ProviderTarget<T>} target - The provider target or token used to resolve the instance.
     * @return {T} The resolved instance associated with the given provider target.
     */
    get<T>(target: ProviderTarget<T>): T;
    /**
     * Enables Cross-Origin Resource Sharing (CORS) for the server using the specified options.
     *
     * @param {CorsOptions | CorsOptionsDelegate} options - The configuration object or function used to set up CORS options.
     * @return {void} This method does not return a value.
     */
    enableCors(options: CorsOptions | CorsOptionsDelegate): void;
    /**
     * Sets a global prefix for all routes in the application.
     * This prefix will be prepended to all controller paths unless specified in the exclude list.
     *
     * @param prefix - The global prefix to be applied to all routes.
     * @param excludePrefix - An optional array of route paths that should not have the global prefix applied.
     */
    setGlobalPrefix(prefix: string, excludePrefix?: string[]): void;
    /**
     * Registers global interceptors for the application.
     * This method allows adding interceptors that will be applied globally to all routes.
     * It supports both regular interceptors (before and after) and error interceptors.
     *
     * @param interceptors - An array of interceptor classes to be instantiated and used globally.
     *                       Each interceptor should be a class that can be instantiated.
     *
     * @remarks
     * The method uses reflection to determine if an interceptor should be executed before or after
     * the main request handling, or if it's an error interceptor. It then adds the interceptor
     * to the appropriate internal array (interceptorsBefore, interceptorsAfter, or interceptorError).
     *
     * @example
     * ```
     * app.useGlobalInterceptors(LoggingInterceptor, ErrorHandlingInterceptor);
     * ```
     */
    useGlobalInterceptors(...interceptors: any[]): void;
    private registerController;
    private instantiateController;
    /**
     * Configures body parsing options for the Express server.
     * This method sets up middleware to parse incoming request bodies based on the provided options.
     *
     * @param options - An object containing configuration options for different body parser types.
     * @param options.urlencoded - Options for parsing URL-encoded bodies. See OptionsUrlencoded for details.
     * @param options.json - Options for parsing JSON bodies. See OptionsJson for details.
     * @param options.raw - Options for parsing raw bodies. See Options for details.
     * @param options.text - Options for parsing plain text bodies. See OptionsText for details.
     *
     * @returns void
     *
     * @remarks
     * This method first applies the express.json() middleware, then iterates through the provided options
     * to apply additional body-parser middleware as specified.
     */
    setBodyParserOptions(options: {
        urlencoded?: OptionsUrlencoded;
        json?: OptionsJson;
        raw?: Options;
        text?: OptionsText;
    }): void;
    /**
     * Sets the rate limit configuration for the instance.
     *
     * @param {Partial<RateOptions>} options - An object containing partial properties of the rate options configuration.
     * @return {void} This method does not return a value.
     */
    setRateLimit(options: Partial<RateOptions>): void;
    private executeInterceptorBefore;
    private executeMiddleware;
    private catch;
    private executeInterceptorAfter;
    start(port: number | string, callback: () => void): Promise<void>;
}
