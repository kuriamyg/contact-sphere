import { Writable } from 'node:stream';

import {
  createLogger,
  PinoNestLogger,
  routeOf,
  safeError,
  scrub,
} from './logger';

function capture() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _enc, done) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      done();
    },
  });
  return { lines, log: createLogger('info', stream) };
}

describe('logging (A5)', () => {
  it('routes: ids and numbers masked, query and fragment dropped', () => {
    expect(
      routeOf(
        '/contacts/0192d6a4-9c1b-7e2a-8f00-1234567890ab/phones?q=mama+njeri',
      ),
    ).toBe('/contacts/:id/phones');
    expect(routeOf('/contacts?q=0712345678')).toBe('/contacts');
    expect(routeOf('/remember/0712345678/x')).toBe('/remember/:n/x');
    expect(routeOf('/contacts/Mama Njeri@x')).toBe('/contacts/:x');
  });

  it('scrubs emails and phone numbers from text', () => {
    expect(scrub('Key (email)=(ann@x.co) and +254 712 345 678 exist')).toBe(
      'Key (email)=([email]) and [number] exist',
    );
  });

  it('keeps an error’s type, first line and frames — not the data after', () => {
    const err = new Error(
      'Invalid `tx.contact.update()` invocation:\n\n{ data: { displayName: "Mama Njeri", notes: "owes 5000" } }',
    );
    const out = safeError(err);
    expect(out.type).toBe('Error');
    expect(out.first).toBe('Invalid `tx.contact.update()` invocation:');
    expect(JSON.stringify(out)).not.toMatch(/Mama|owes/);
    expect((out.frames as string[]).every((f) => f.startsWith('at '))).toBe(
      true,
    );
  });

  it('redacts secret and personal fields anywhere in a logged object', () => {
    const { lines, log } = capture();
    log.info(
      {
        password: 'p',
        body: { email: 'a@b.co', phones: ['0712'], notes: 'n' },
        headers: { authorization: 'Session abc' },
      },
      'x',
    );
    const s = JSON.stringify(lines[0]);
    expect(s).not.toMatch(/a@b\.co|0712|Session abc|"p"/);
    expect(lines[0].password).toBe('[redacted]');
  });

  it('Nest errors go out as one safe JSON line', () => {
    const { lines, log } = capture();
    const nest = new PinoNestLogger(log);
    const err = new Error('duplicate for ann@x.co\nDETAIL: Mama Njeri');
    nest.error(err.message, err.stack, 'ExceptionsHandler');
    nest.error('Trash purge failed', err);
    nest.log('Nest application successfully started', 'NestApplication');
    const s = JSON.stringify(lines);
    expect(s).not.toMatch(/ann@x\.co|Mama Njeri/);
    expect(lines[0]).toMatchObject({
      level: 'error',
      context: 'ExceptionsHandler',
      msg: 'duplicate for [email]',
    });
    expect(lines[1]).toMatchObject({
      msg: 'Trash purge failed',
      err: { type: 'Error' },
    });
    expect(lines[2]).toMatchObject({ level: 'info', service: 'api' });
  });
});
