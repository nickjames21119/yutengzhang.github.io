-- Never store a raw IP, user agent, URL path or browser fingerprint.
CREATE TABLE IF NOT EXISTS visit_dedup (
  day TEXT NOT NULL,
  token TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude REAL NOT NULL CHECK(latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK(longitude BETWEEN -180 AND 180),
  PRIMARY KEY(day, token)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS visit_days (
  day TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  visits INTEGER NOT NULL DEFAULT 1 CHECK(visits >= 1),
  PRIMARY KEY(day, country, latitude, longitude)
) WITHOUT ROWID;
-- Deduplication and increment are one atomic SQLite operation. Two concurrent
-- requests with the same token cannot both increment the count.
CREATE TRIGGER IF NOT EXISTS count_new_visit AFTER INSERT ON visit_dedup
BEGIN
  INSERT INTO visit_days(day,country,latitude,longitude,visits)
  VALUES(NEW.day,NEW.country,NEW.latitude,NEW.longitude,1)
  ON CONFLICT(day,country,latitude,longitude)
  DO UPDATE SET visits=visits+1;
END;
