-- ADR 002: 迁移经历分组外键至 user_id 并清理 workspaces 表
ALTER TABLE experience_groups ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- 将旧的工作区 owner_id 回填到经历分组的 user_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspaces') THEN
    EXECUTE 'UPDATE experience_groups eg SET user_id = w.owner_id FROM workspaces w WHERE eg.workspace_id = w.id AND eg.user_id IS NULL';
  END IF;
END $$;

-- 移除没有有效 user_id 的孤立测试数据
DELETE FROM experience_groups WHERE user_id IS NULL;

-- 设置非空约束
ALTER TABLE experience_groups ALTER COLUMN user_id SET NOT NULL;

-- 移除旧外键与旧列
ALTER TABLE experience_groups DROP CONSTRAINT IF EXISTS experience_groups_workspace_id_fkey;
DROP INDEX IF EXISTS ix_experience_groups_workspace_id;
ALTER TABLE experience_groups DROP COLUMN IF EXISTS workspace_id;

-- 建立新外键与索引
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'experience_groups_user_id_fkey') THEN
    ALTER TABLE experience_groups ADD CONSTRAINT experience_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_experience_groups_user_id ON experience_groups(user_id);

-- 删除旧表
DROP TABLE IF EXISTS workspaces CASCADE;
