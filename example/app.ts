import 'reflect-metadata';
import path from "path";
import {
	Action,
	Context,
	ErrorInterceptor,
	Injectable,
	Interceptor,
	NotFoundHandler,
	ResponseInterceptor,
	ServerFactory,
	CoreMiddleware
} from "../src";
import dotenv from "dotenv";

dotenv.config();
import {Server} from "socket.io";
import {
	NextFunction,
	Request,
	Response
} from "express";
import { UserDto } from "./controllers/user/dto/user-dto";
import { DemoAccessControlGuard } from "./guards/access-control-guard";

@Injectable()
class GlobalErrorInterceptor implements ErrorInterceptor {
	catch({error}: Action) {
		const status = error.statusCode || 500;
		console.error(`[Error] ${error.message}`, error.stack);
		console.error('detail', error.details);
		
		const filteredStack = error.stack
			? error.stack
			.split('\n')
			.filter((line: any) => !line.includes('node_modules')) // Remove node_modules paths
			.join('\n')
			: '';
		
		return {
			status,
			message: error.message || 'Internal Server Error',
			stack: filteredStack,
			details: Array.isArray(error.details) ? error.details.map(function (detail: any) {
				return detail
			}) : error.details
		};
	}
}

@Injectable()
export class Service {
	
	create(body: UserDto) {
		return "Service created";
	}
	
	update(_data: any) {
		return "Service updated";
	}
	
}

export class NotFoundInterceptor implements NotFoundHandler {
	handle(context: Context) {
		return {
			message: 'Route Not Found',
			method: context.request.method,
			route: context.request.path,
			success: false,
			statusCode: 404
		};
	}
}

@ResponseInterceptor()
export class ResponseTransformerInterceptor implements Interceptor {
	intercept(context: Context, data: any) {
		const before = Date.now();
		return {
			data,
			duration: `${Date.now() - before}ms`,
			method: context.request.method,
			route: context.request.path,
			success: true,
			statusCode: context.response.statusCode
		};
	}
}

@Injectable()
class Middleware implements CoreMiddleware {
	use(req: Request, res: Response, next: NextFunction): void {
		next()
	}
}

const app = ServerFactory.createServer({
	controllers: [
		path.join(__dirname, './controllers/**/*.{js,ts}')
	],
	providers: [
		Service,
	],
	enableLogging: true,
	SocketIO: Server,
	socketMiddleware: (socket, next) => {
		socket.data.user = "ME";
		next();
	},
	socketOptions: {
		cors: {
			origin: "*"
		}
	}
});

app.enableCors({
	credentials: true,
	origin: '*'
});

app.setRateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
})

app.setBodyParserOptions({
	urlencoded: {
		extended: false
	}
});
app.useGlobalMiddleware(Middleware)
app.useAccessControl(DemoAccessControlGuard);
app.setGlobalPrefix('/api/v1');
// Business-code errors thrown with `bodyOnly: true` (see RoleController.insufficientBalance)
// respond with this HTTP status; the real code stays in the body.
app.setDefaultErrorStatusCode(200);
app.useGlobalInterceptors(
	ResponseTransformerInterceptor,
	GlobalErrorInterceptor
);
app.useNotFoundHandler(NotFoundInterceptor);

const PORT = 3100;
app.start(PORT, () => {
	console.log(`🚀 Server running at http://localhost:${PORT}`);
});
