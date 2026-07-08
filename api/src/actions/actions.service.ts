import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as crypto from 'crypto';

export interface CreateControlActionDto {
  actionType: string;
  targetUuid?: string;
  targetName?: string;
  payload?: any;
}

@Injectable()
export class ActionsService {
  constructor(private readonly db: DatabaseService) {}

  async enqueueAction(staffUser: any, data: CreateControlActionDto): Promise<any> {
    if (!data.actionType) {
      throw new BadRequestException('actionType é obrigatório');
    }
    if (!data.targetUuid && !data.targetName) {
      throw new BadRequestException('É necessário informar targetUuid ou targetName');
    }

    const pool = this.db.getPool();
    const idempotencyKey = crypto.randomUUID();

    const [result]: any = await pool.execute(
      `
      INSERT INTO culling_control_actions
      (origin, actor_type, actor_id, actor_name, action_type, target_uuid, target_name, payload_json, idempotency_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        'DASHBOARD',
        'STAFF',
        staffUser.discordId,
        staffUser.discordName,
        data.actionType,
        data.targetUuid || null,
        data.targetName || null,
        JSON.stringify(data.payload || {}),
        idempotencyKey,
      ]
    );

    return {
      success: true,
      actionId: result.insertId,
      message: 'Ação enviada para a fila do servidor.',
    };
  }

  async getActionStatus(actionId: number): Promise<any> {
    const pool = this.db.getPool();
    const [rows]: any = await pool.execute(
      `
      SELECT id, action_type, status, attempts, last_error, result_json, created_at, processed_at
      FROM culling_control_actions
      WHERE id = ?
      LIMIT 1
      `,
      [actionId]
    );

    if (rows.length === 0) {
      throw new BadRequestException('Ação não encontrada');
    }

    return {
      success: true,
      data: rows[0],
    };
  }
}
