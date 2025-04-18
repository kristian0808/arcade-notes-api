import { 
  WebSocketGateway, 
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { IcafeService } from '../icafe/icafe.service';
import { Interval } from '@nestjs/schedule';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Add your frontend URLs
    credentials: true
  }
})
export class DashboardGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DashboardGateway.name);
  private clientCount = 0;

  @WebSocketServer()
  server: Server;

  constructor(private readonly icafeService: IcafeService) {}
  
  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }
  
  handleConnection(client: Socket) {
    this.clientCount++;
    this.logger.log(`Client connected: ${client.id}. Total clients: ${this.clientCount}`);
    
    // Send immediate update to the new client
    this.handlePcUpdates()
      .catch(err => this.logger.error('Error sending initial PC updates', err));
    
    // Also send initial member updates to the new client
    this.handleMemberUpdates()
      .catch(err => this.logger.error('Error sending initial member updates', err));
  }
  
  handleDisconnect(client: Socket) {
    this.clientCount--;
    this.logger.log(`Client disconnected: ${client.id}. Total clients: ${this.clientCount}`);
  }

  @Interval(10000) // Poll every 10 seconds - adjust as needed
  async handlePcUpdates() {
    // Only fetch and emit if there are connected clients
    if (this.clientCount > 0) {
      try {
        const pcs = await this.icafeService.getPcsWithUserInfo();
        this.logger.debug(`Broadcasting PC updates to ${this.clientCount} clients`);
        this.server.emit('pcs_update', pcs);
      } catch (error) {
        this.logger.error('Failed to fetch PC updates:', error);
      }
    }
  }

  @Interval(30000) // Poll every 30 seconds for members (can be longer than PCs since they change less frequently)
  async handleMemberUpdates() {
    // Only fetch and emit if there are connected clients
    if (this.clientCount > 0) {
      try {
        const members = await this.icafeService.getAllMembers();
        this.logger.debug(`Broadcasting member updates to ${this.clientCount} clients`);
        this.server.emit('members_update', members);
      } catch (error) {
        this.logger.error('Failed to fetch member updates:', error);
      }
    }
  }
}