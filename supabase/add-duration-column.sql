-- Add duration column to maintenance_records table
ALTER TABLE maintenance_records
ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN maintenance_records.duration IS '保养时长（分钟）';
