import 'reflect-metadata';
import cluster from "cluster";
import http from "http";
import os from "os";
import { setupMaster, setupWorker } from "@socket.io/sticky";
import { createAdapter, setupPrimary } from "@socket.io/cluster-adapter";
import { buildApp, PORT } from "./app";

const WORKER_COUNT = Number(process.env.WORKERS) || os.cpus().length;

/**
 * Reproduces the "run in cluster mode" production topology locally, to
 * verify the framework behaves correctly (HTTP + Socket.IO) when the API
 * is split across multiple worker processes rather than nodemon's single
 * process (see app.ts / npm run dev).
 *
 * Socket.IO needs two things cluster mode alone doesn't give it:
 *  - session affinity, so a client's polling handshake (and its eventual
 *    websocket upgrade) always lands on the same worker that accepted the
 *    first request — without this, requests can bounce between workers and
 *    fail with "Session ID unknown". @socket.io/sticky provides this.
 *  - a shared adapter, so io.to(room).emit() (or a broadcast triggered from
 *    an HTTP route) reaches sockets connected to *other* workers, not just
 *    the emitting one. @socket.io/cluster-adapter provides this over the
 *    same cluster IPC channel sticky uses.
 */
if (cluster.isPrimary) {
	console.log(`[primary ${process.pid}] starting ${WORKER_COUNT} workers`);

	const httpServer = http.createServer();

	setupMaster(httpServer, {
		loadBalancingMethod: "least-connection"
	});
	// Needed by @socket.io/cluster-adapter: lets structured (non-JSON-safe)
	// messages travel over the primary<->worker IPC channel.
	cluster.setupPrimary({ serialization: "advanced" });
	setupPrimary();

	for (let i = 0; i < WORKER_COUNT; i++) {
		cluster.fork();
	}

	cluster.on("exit", (worker, code, signal) => {
		console.log(`[primary] worker ${worker.process.pid} died (code ${code}, signal ${signal}), forking a replacement`);
		cluster.fork();
	});

	httpServer.listen(PORT, () => {
		console.log(`🚀 Cluster primary balancing http://localhost:${PORT} across ${WORKER_COUNT} workers`);
	});
} else {
	const { adapter, socketApp } = buildApp();

	// Registers controllers/middleware/interceptors and constructs
	// socketApp.socketServer, but does NOT bind PORT — the primary owns the
	// real listening socket and hands connections to this worker over IPC.
	adapter.startApps().then(() => {
		setupWorker(socketApp.socketServer);
		socketApp.socketServer.adapter(createAdapter());
		console.log(`[worker ${process.pid}] ready`);
	}).catch((err) => {
		console.error(`[worker ${process.pid}] failed to start`, err);
		process.exit(1);
	});
}
