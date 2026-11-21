ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_type_check;
ALTER TABLE activities ADD CONSTRAINT activities_type_check CHECK (type IN (
                                                                            'NOTE_CREATED', 'NOTE_UPDATED', 'NOTE_DELETED', 'NOTE_ARCHIVED', 'NOTE_UNARCHIVED', 'NOTE_RESTORED',
                                                                            'WORKSPACE_CREATED', 'WORKSPACE_UPDATED', 'WORKSPACE_DELETED', 'WORKSPACE_RESTORED',
                                                                            'RESOURCE_ADDED', 'RESOURCE_UPDATED', 'RESOURCE_DELETED', 'TAG_CREATED',
                                                                            'MEMBER_INVITED', 'MEMBER_INVITE_REVOKED', 'MEMBER_INVITE_DECLINED',
                                                                            'MEMBER_JOINED', 'MEMBER_LEFT', 'MEMBER_REMOVED', 'MEMBER_ROLE_CHANGED'));