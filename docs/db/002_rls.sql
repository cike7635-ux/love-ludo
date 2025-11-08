-- M1: Row Level Security policies
-- Enable RLS and define access rules per table.

-- Enable RLS on all business tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

-- profiles: any authenticated can read; only owner can insert/update
CREATE POLICY profiles_select_authenticated ON profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY profiles_insert_self ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- themes: public readable by any authenticated; only owner can write/delete
CREATE POLICY themes_select_public_or_owner ON themes
  FOR SELECT TO authenticated
  USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY themes_insert_owner ON themes
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY themes_update_owner ON themes
  FOR UPDATE TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY themes_delete_owner ON themes
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- tasks: readable if theme is public or user owns the theme; only theme owner can write/delete
CREATE POLICY tasks_select_by_theme_visibility_or_owner ON tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM themes t
      WHERE t.id = tasks.theme_id
        AND (t.is_public = true OR t.creator_id = auth.uid())
    )
  );

CREATE POLICY tasks_insert_only_theme_owner ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM themes t
      WHERE t.id = tasks.theme_id AND t.creator_id = auth.uid()
    )
  );

CREATE POLICY tasks_update_only_theme_owner ON tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM themes t
      WHERE t.id = tasks.theme_id AND t.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM themes t
      WHERE t.id = tasks.theme_id AND t.creator_id = auth.uid()
    )
  );

CREATE POLICY tasks_delete_only_theme_owner ON tasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM themes t
      WHERE t.id = tasks.theme_id AND t.creator_id = auth.uid()
    )
  );

-- Allow room participants to read tasks of themes chosen in their room (waiting/playing)
CREATE POLICY tasks_select_room_participants ON tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE (r.player1_id = auth.uid() OR r.player2_id = auth.uid())
        AND (r.player1_theme_id = tasks.theme_id OR r.player2_theme_id = tasks.theme_id)
        AND r.status IN ('waiting', 'playing', 'completed')
    )
  );

-- rooms: participants can read/write; allow reading waiting rooms by anyone authenticated for join flow
CREATE POLICY rooms_select_participants_or_waiting ON rooms
  FOR SELECT TO authenticated
  USING (
    creator_id = auth.uid()
    OR player1_id = auth.uid()
    OR player2_id = auth.uid()
    OR status = 'waiting'
  );

CREATE POLICY rooms_insert_creator ON rooms
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY rooms_update_participants ON rooms
  FOR UPDATE TO authenticated
  USING (
    creator_id = auth.uid() OR player1_id = auth.uid() OR player2_id = auth.uid()
  )
  WITH CHECK (
    creator_id = auth.uid() OR player1_id = auth.uid() OR player2_id = auth.uid()
  );

-- 允许任意已登录用户在等待中的房间进行“加入”更新（填充 player2）
-- 注意：USING 判断旧行，要求房间处于 waiting 且尚未有 player2；
--       WITH CHECK 判断新行，要求被更新后的 player2_id 等于当前用户且状态仍为 waiting。
CREATE POLICY rooms_update_join_waiting ON rooms
  FOR UPDATE TO authenticated
  USING (status = 'waiting' AND player2_id IS NULL)
  WITH CHECK (status = 'waiting' AND player2_id = auth.uid());

CREATE POLICY rooms_delete_creator ON rooms
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- game_sessions: only participants can read/write
CREATE POLICY game_sessions_select_participants ON game_sessions
  FOR SELECT TO authenticated
  USING (player1_id = auth.uid() OR player2_id = auth.uid());

CREATE POLICY game_sessions_insert_participants ON game_sessions
  FOR INSERT TO authenticated
  WITH CHECK (player1_id = auth.uid() OR player2_id = auth.uid());

CREATE POLICY game_sessions_update_participants ON game_sessions
  FOR UPDATE TO authenticated
  USING (player1_id = auth.uid() OR player2_id = auth.uid())
  WITH CHECK (player1_id = auth.uid() OR player2_id = auth.uid());

-- allow participants to delete their sessions after completion/archival
CREATE POLICY game_sessions_delete_participants ON game_sessions
  FOR DELETE TO authenticated
  USING (player1_id = auth.uid() OR player2_id = auth.uid());

-- game_moves: only session participants can read; writer must be self and belong to session
CREATE POLICY game_moves_select_participants ON game_moves
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions s
      WHERE s.id = game_moves.session_id
        AND (s.player1_id = auth.uid() OR s.player2_id = auth.uid())
    )
  );

CREATE POLICY game_moves_insert_by_self ON game_moves
  FOR INSERT TO authenticated
  WITH CHECK (
    player_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM game_sessions s
      WHERE s.id = game_moves.session_id
        AND (s.player1_id = auth.uid() OR s.player2_id = auth.uid())
    )
  );

-- 允许本人更新自己的回合记录（用于写入 task_id / task_completed）
DROP POLICY IF EXISTS game_moves_update_by_self ON game_moves;
DROP POLICY IF EXISTS game_moves_update_participants ON game_moves;
CREATE POLICY game_moves_update_participants ON game_moves
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions s
      WHERE s.id = game_moves.session_id
        AND (s.player1_id = auth.uid() OR s.player2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions s
      WHERE s.id = game_moves.session_id
        AND (s.player1_id = auth.uid() OR s.player2_id = auth.uid())
    )
  );

-- allow participants to delete moves of their session during cleanup
CREATE POLICY game_moves_delete_participants ON game_moves
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions s
      WHERE s.id = game_moves.session_id
        AND (s.player1_id = auth.uid() OR s.player2_id = auth.uid())
    )
  );

-- game_history: participants can read; insert by participants
CREATE POLICY game_history_select_participants ON game_history
  FOR SELECT TO authenticated
  USING (player1_id = auth.uid() OR player2_id = auth.uid());

CREATE POLICY game_history_insert_participants ON game_history
  FOR INSERT TO authenticated
  WITH CHECK (player1_id = auth.uid() OR player2_id = auth.uid());

-- Note: UPDATE/DELETE typically by server arbitration logic; keep closed by default