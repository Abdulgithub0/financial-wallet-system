import { db } from '../database/postgres';

interface AuditLogData {
  actorId: string | null;
  eventType: string;
  eventData: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  async log(data: AuditLogData): Promise<void> {
    try {
      await db.query(
        `INSERT INTO audit_logs (actor_id, event_type, event_data, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          data.actorId,
          data.eventType,
          JSON.stringify(data.eventData),
          data.ipAddress || null,
          data.userAgent || null,
        ]
      );
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  async logUserRegistration(userId: string, email: string, ipAddress?: string): Promise<void> {
    await this.log({
      actorId: userId,
      eventType: 'USER_REGISTERED',
      eventData: { email },
      ipAddress,
    });
  }

  async logUserLogin(userId: string, email: string, ipAddress?: string): Promise<void> {
    await this.log({
      actorId: userId,
      eventType: 'USER_LOGIN',
      eventData: { email },
      ipAddress,
    });
  }

  async logTransaction(
    userId: string,
    transactionId: string,
    type: string,
    amount: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      actorId: userId,
      eventType: 'TRANSACTION_CREATED',
      eventData: { transactionId, type, amount },
      ipAddress,
    });
  }
}

export const auditService = new AuditService();

