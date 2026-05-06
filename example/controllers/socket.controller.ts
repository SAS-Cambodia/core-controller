import {
	SocketController,
	SocketEventAdapter,
	SocketEvent,
	SocketBody,
	SocketResponse,
	SocketCallBack,
	SocketData
} from "../../src";
import { Socket } from "socket.io";
import { UserDto } from "./user/dto/user-dto";

@SocketController('/waiter')
export class UserSocketController implements SocketEventAdapter {
	
    @SocketEvent('confirm')
    handleConfirm(
		@SocketBody() data: UserDto,
		@SocketResponse() res: SocketCallBack
    ): void {
        console.log('Order received',{data});
	    res({
		    status: 200,
		    data,
	    })
    }

    @SocketEvent('pick')
    handlePickOder(
		@SocketData() data:any,
		@SocketResponse() res: SocketCallBack
    ) {
	    res({
			status: 200,
		    data,
	    })
    }

    onConnect(socket: Socket): void {
        // console.log('dd',this.service.create());
        // console.log('gg',this.serviceV2.create());
    }

    onDisconnect(socket: Socket,reason:string): void {
        console.log('disconnected',socket.id,reason);
    }
   
}
