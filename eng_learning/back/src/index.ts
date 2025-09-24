// back/src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json());

// --- PG Pool ---
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', (e) => console.error('PG error', e));

// --- 헬스체크 ---
app.get('/health', async (_req, res) => {
  const r = await pool.query('select now() as now');
  res.json({ ok: true, now: r.rows[0].now });
});

// --- 스키마 검증 ---
const createSchema = z.object({
  word: z.string().min(1),
  meaning: z.string().min(1),
  part_of_speech: z.string().optional(),
  example: z.string().optional(),
  tags: z.array(z.string()).optional(),
  user_id: z.string().uuid().optional(),
});

// 목록/검색
app.get('/vocab', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '');
    const take = Math.min(Number(req.query.take ?? 200), 500);
    const params: any[] = [];
    let where = '';
    if (q) {
      params.push(`%${q}%`, `%${q}%`, q);
      where = `where word ilike $1 or meaning ilike $2 or $3 = any(tags)`;
    }
    const sql = `
      select * from public.vocab
      ${where}
      order by created_at desc
      limit ${take}
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) { next(e); }
});

// 추가
app.post('/vocab', async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const { word, meaning, part_of_speech, example } = input;
    const tags = input.tags ?? [];
    const user_id = input.user_id ?? null;
    const sql = `
      insert into public.vocab (user_id, word, meaning, part_of_speech, example, tags)
      values ($1, $2, $3, $4, $5, $6)
      returning *
    `;
    const { rows } = await pool.query(sql, [user_id, word, meaning, part_of_speech ?? null, example ?? null, tags]);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

// 수정
app.patch('/vocab/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowed = ['word','meaning','part_of_speech','example','tags','familiarity','review_due'] as const;
    const sets: string[] = [];
    const vals: any[] = [];
    for (const k of allowed) {
      if (k in req.body) {
        sets.push(`${k} = $${vals.length + 1}`);
        vals.push((req.body as any)[k]);
      }
    }
    if (sets.length === 0) return res.status(400).json({ error: 'no fields to update' });
    vals.push(id);
    const sql = `update public.vocab set ${sets.join(', ')} where id = $${vals.length} returning *`;
    const { rows } = await pool.query(sql, vals);
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// 삭제
app.delete('/vocab/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('delete from public.vocab where id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (e) { next(e); }
});

// 복습 스케줄
app.post('/vocab/:id/schedule', async (req, res, next) => {
  try {
    const { id } = req.params;
    const grade = Number(req.body.grade ?? 1) as 0|1|2|3|4|5;
    const days = [0.5, 1, 2, 4, 7, 14][grade] ?? 1;
    const sql = `
      update public.vocab
      set familiarity = $1,
          review_due  = now() + ($2 || ' days')::interval
      where id = $3
      returning *
    `;
    const { rows } = await pool.query(sql, [grade, days, id]);
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// 에러 핸들러
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  if (err?.name === 'ZodError') return res.status(400).json({ error: err.issues });
  res.status(500).json({ error: 'server error' });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
