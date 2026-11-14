ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_type_check;
ALTER TABLE activities ADD CONSTRAINT activities_type_check CHECK (type IN (
                                                                            'NOTE_CREATED','NOTE_UPDATED','NOTE_DELETED',
                                                                            'WORKSPACE_CREATED','WORKSPACE_UPDATED','WORKSPACE_DELETED',
                                                                            'RESOURCE_ADDED','RESOURCE_UPDATED','RESOURCE_DELETED','TAG_CREATED',
                                                                            'MEMBER_INVITED','MEMBER_INVITE_REVOKED','MEMBER_INVITE_DECLINED',
                                                                            'MEMBER_JOINED','MEMBER_LEFT','MEMBER_REMOVED','MEMBER_ROLE_CHANGED'));

CREATE INDEX idx_activities_workspace_created ON activities (workspace_id, created_at DESC);
CREATE INDEX idx_activities_user_created ON activities (user_id, created_at DESC);