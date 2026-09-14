const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'karate.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    tournament_id TEXT,
    name TEXT NOT NULL,
    gender TEXT,
    min_age INTEGER,
    max_age INTEGER,
    min_weight REAL,
    max_weight REAL,
    capacity INTEGER DEFAULT 32,
    status TEXT DEFAULT 'Open',
    format TEXT DEFAULT 'knockout',
    category_timer_seconds INTEGER,
    category_timer_source TEXT,
    category_timer_updated_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const rawData = `5-7 YEARS MALE KATA	Male	5	7	0	99	knockout	32
5-7 YEARS FEMALE KATA	Female	5	7	0	99	knockout	32
8-10 YEARS MALE KATA	Male	8	10	0	99	knockout	32
8-10 YEARS FEMALE KATA	Female	8	10	0	99	knockout	32
11-13 YEARS MALE KATA	Male	11	13	0	99	knockout	32
11-13 YEARS FEMALE KATA	Female	11	13	0	99	knockout	32
14-15 YEARS MALE KATA	Male	14	15	0	99	knockout	32
14-15 YEARS FEMALE KATA	Female	14	15	0	99	knockout	32
16-17 YEARS MALE KATA	Male	16	17	0	99	knockout	32
16-17 YEARS FEMALE KATA	Female	16	17	0	99	knockout	32
18-21 YEARS MALE KATA	Male	18	21	0	99	knockout	32
18-21 YEARS FEMALE KATA	Female	18	21	0	99	knockout	32
5 YEARS MALE KUMITE	Male	5	5	0	99	knockout	32
5 YEARS FEMALE KUMITE	Female	5	5	0	99	knockout	32
6-7 YEARS MALE KUMITE (BELOW 24KG)	Male	6	7	0	24.5	knockout	32
6-7 YEARS FEMALE KUMITE (BELOW 20KG)	Female	6	7	0	20.5	knockout	32
6-7 YEARS MALE KUMITE (ABOVE 24KG)	Male	6	7	24.6	99	knockout	32
6-7 YEARS FEMALE KUMITE (ABOVE 20KG)	Female	6	7	20.6	99	knockout	32
8-9 YEARS MALE KUMITE (BELOW 25KG)	Male	8	9	0	25.5	knockout	32
8-9 YEARS FEMALE KUMITE (BELOW 25KG)	Female	8	9	0	25.5	knockout	32
8-9 YEARS MALE KUMITE (ABOVE 25KG)	Male	8	9	25.6	99	knockout	32
8-9 YEARS FEMALE KUMITE (ABOVE 25KG)	Female	8	9	25.6	99	knockout	32
10-11 YEARS MALE KUMITE (BELOW 30KG)	Male	10	11	0	30.5	knockout	32
10-11 YEARS FEMALE KUMITE (BELOW 30KG)	Female	10	11	0	30.5	knockout	32
10-11 YEARS MALE KUMITE (BELOW 40KG)	Male	10	11	30.6	40.5	knockout	32
10-11 YEARS FEMALE KUMITE (BELOW 40KG)	Female	10	11	30.6	40.5	knockout	32
10-11 YEARS MALE KUMITE (ABOVE 40KG)	Male	10	11	40.6	99	knockout	32
10-11 YEARS FEMALE KUMITE (ABOVE 40KG)	Female	10	11	40.6	99	knockout	32
12-13 YEARS MALE KUMITE (BELOW 40KG)	Male	12	13	0	40.5	knockout	32
12-13 YEARS FEMALE KUMITE (BELOW 42KG)	Female	12	13	0	42.5	knockout	32
12-13 YEARS MALE KUMITE (BELOW 45KG)	Male	12	13	40.6	45.5	knockout	32
12-13 YEARS FEMALE KUMITE (BELOW 47KG)	Female	12	13	42.6	47.5	knockout	32
12-13 YEARS MALE KUMITE (ABOVE 45KG)	Male	12	13	45.6	999	knockout	32
12-13 YEARS FEMALE KUMITE (ABOVE 47KG)	Female	12	13	47.6	999	knockout	32
14-15 YEARS MALE KUMITE (BELOW 52KG)	Male	14	15	0	52.5	knockout	32
14-15 YEARS FEMALE KUMITE (BELOW 47KG)	Female	14	15	0	47.5	knockout	32
14-15 YEARS MALE KUMITE (BELOW 57KG)	Male	14	15	52.6	57.5	knockout	32
14-15 YEARS FEMALE KUMITE (BELOW 54KG)	Female	14	15	47.6	54.5	knockout	32
14-15 YEARS MALE KUMITE (ABOVE 57KG)	Male	14	15	57.6	999	knockout	32
14-15 YEARS FEMALE KUMITE (ABOVE 54KG)	Female	14	15	54.6	999	knockout	32
16-17 YEARS MALE KUMITE (BELOW 55KG)	Male	16	17	0	55.5	knockout	32
16-17 YEARS FEMALE KUMITE (BELOW 48KG)	Female	16	17	0	48.5	knockout	32
16-17 YEARS MALE KUMITE (BELOW 61KG)	Male	16	17	55.6	61.5	knockout	32
16-17 YEARS FEMALE KUMITE (BELOW 53KG)	Female	16	17	48.6	53.5	knockout	32
16-17 YEARS MALE KUMITE (BELOW 68KG)	Male	16	17	61.6	68.5	knockout	32
16-17 YEARS FEMALE KUMITE (BELOW 59KG)	Female	16	17	53.6	59.5	knockout	32
16-17 YEARS MALE KUMITE (ABOVE 68KG)	Male	16	17	68.6	999	knockout	32
16-17 YEARS FEMALE KUMITE (ABOVE 59KG)	Female	16	17	59.6	999	knockout	32
18-21 YEARS MALE KUMITE (BELOW 57KG)	Male	18	21	0	57.5	knockout	32
18-21 YEARS FEMALE KUMITE (BELOW 52KG)	Female	18	21	0	52.5	knockout	32
18-21 YEARS MALE KUMITE (BELOW 62KG)	Male	18	21	57.6	62.5	knockout	32
18-21 YEARS FEMALE KUMITE (BELOW 57KG)	Female	18	21	52.6	57.5	knockout	32
18-21 YEARS MALE KUMITE (BELOW 70KG)	Male	18	21	62.6	70.5	knockout	32
18-21 YEARS FEMALE KUMITE (BELOW 62KG)	Female	18	21	57.6	62.5	knockout	32
18-21 YEARS MALE KUMITE (ABOVE 70KG)	Male	18	21	70.6	999	knockout	32
18-21 YEARS FEMALE KUMITE (ABOVE 62KG)	Female	18	21	62.6	999	knockout	32
22-40 YEARS MALE KUMITE (OPEN)	Male	22	40	40	999	knockout	32`;

const lines = rawData.trim().split('\n');
const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO categories (id, name, gender, min_age, max_age, min_weight, max_weight, format, capacity, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const categories = lines.map((line, idx) => {
  const [name, gender, minAge, maxAge, minWeight, maxWeight, format, capacity] = line.split('\t');
  const id = `cat-seed-${idx + 1}`;
  return {
    id,
    name: name.trim(),
    gender: gender.trim(),
    min_age: parseInt(minAge, 10),
    max_age: parseInt(maxAge, 10),
    min_weight: parseFloat(minWeight),
    max_weight: parseFloat(maxWeight),
    format: format ? format.trim() : 'knockout',
    capacity: parseInt(capacity, 10) || 32,
    status: 'Open'
  };
});

const insertMany = db.transaction((cats) => {
  for (const c of cats) {
    insertStmt.run(c.id, c.name, c.gender, c.min_age, c.max_age, c.min_weight, c.max_weight, c.format, c.capacity, c.status);
  }
});

insertMany(categories);
console.log(`Successfully seeded ${categories.length} categories into SQLite database!`);
