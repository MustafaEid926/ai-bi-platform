import amqp, { type ConsumeMessage } from 'amqplib';
import { randomUUID } from 'node:crypto';
import { env } from '@aibi/config';

let conn: amqp.ChannelModel | undefined;
let channel: amqp.Channel | undefined;

export async function connectBus(): Promise<void> {
  conn = await amqp.connect(env.rabbitmq);
  channel = await conn.createChannel();

  await channel.assertExchange('aibi.events', 'topic', {
    durable: true,
  });
}

export async function publish(
  eventType: string,
  payload: unknown,
  meta: {
    producer?: string;
    organization_id?: string;
    correlation_id?: string;
  } = {},
): Promise<void> {
  if (!channel) return;

  const event = {
    event_id: randomUUID(),
    event_type: eventType,
    event_version: 1,
    occurred_at: new Date().toISOString(),
    producer: meta.producer ?? 'unknown',
    organization_id: meta.organization_id,
    correlation_id: meta.correlation_id,
    payload,
  };

  channel.publish(
    'aibi.events',
    eventType,
    Buffer.from(JSON.stringify(event)),
    {
      persistent: true,
      contentType: 'application/json',
    },
  );
}

export async function subscribe(
  queue: string,
  keys: string[],
  handler: (event: unknown) => Promise<void>,
): Promise<void> {
  if (!channel) {
    throw new Error('RabbitMQ channel is not connected');
  }

  await channel.assertQueue(queue, {
    durable: true,
  });

  for (const key of keys) {
    await channel.bindQueue(queue, 'aibi.events', key);
  }

  await channel.consume(
    queue,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const event = JSON.parse(msg.content.toString()) as unknown;

        await handler(event);

        channel?.ack(msg);
      } catch {
        channel?.nack(msg, false, false);
      }
    },
  );
}
