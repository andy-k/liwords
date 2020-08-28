package user

import (
	"context"
	"strings"

	"github.com/domino14/liwords/pkg/entity"
	"github.com/gomodule/redigo/redis"
)

const (
	NullPresenceChannel = "NULL"
)

// RedisPresenceStore implements a Redis store for user presence.
type RedisPresenceStore struct {
	redisPool *redis.Pool

	setPresenceScript *redis.Script
}

const SetPresenceScript = `
-- Arguments to this LUA script:
-- uuid, username, channel string  (ARGV[1] through [3])

local presencekey = "presence:user:"..ARGV[1]
local channelpresencekey = "presence:channel:"..ARGV[3]
local userkey = ARGV[1].."#"..ARGV[2]  -- uuid#username

-- get the current channel that this presence is in.
local curchannel = redis.call("HGET", presencekey, "channel")

-- compare with false; Lua converts redis nil reply to false
if curchannel ~= false then
    -- the presence is already somewhere else. we must delete it from the right SET
    redis.call("SREM", "presence:channel:"..curchannel, userkey)
end

if ARGV[3] ~= "NULL" then
    redis.call("HSET", presencekey, "username", ARGV[2], "channel", ARGV[3])
    -- and add to the channel presence
    redis.call("SADD", channelpresencekey, userkey)
else
    -- if the channel string is a physical "NULL" this is equivalent to signing off.
    redis.call("DEL", presencekey)
end

`

func NewRedisPresenceStore(r *redis.Pool) *RedisPresenceStore {

	return &RedisPresenceStore{
		redisPool:         r,
		setPresenceScript: redis.NewScript(0, SetPresenceScript),
	}
}

// SetPresence sets the user's presence channel.
func (s *RedisPresenceStore) SetPresence(ctx context.Context, uuid, username, channel string) error {
	// We try to map channels closely to the pubsub NATS channels (and realms),
	// with some exceptions.
	// If the user is online in two different tabs, we go in priority order,
	// as we only want to show them in one place.
	// Priority (from lowest to highest):
	// 	- lobby - The "base" channel.
	//  - usertv.<user_id> - Following a user's games
	//  - gametv.<game_id> - Watching a game
	//  - game.<game_id> - Playing in a game

	conn := s.redisPool.Get()
	defer conn.Close()
	_, err := s.setPresenceScript.Do(conn, uuid, username, channel)
	return err
}

func (s *RedisPresenceStore) ClearPresence(ctx context.Context, uuid, username string) error {
	return s.SetPresence(ctx, uuid, username, NullPresenceChannel)
}

func (s *RedisPresenceStore) GetInChannel(ctx context.Context, channel string) ([]*entity.User, error) {

	conn := s.redisPool.Get()
	defer conn.Close()

	key := "presence:channel:" + channel

	vals, err := redis.Strings(conn.Do("SMEMBERS", key))
	if err != nil {
		return nil, err
	}
	users := make([]*entity.User, len(vals))

	for idx, member := range vals {
		splitmember := strings.Split(member, "#")
		users[idx] = &entity.User{
			UUID:     splitmember[0],
			Username: splitmember[1],
		}
	}

	return users, nil
}

// Get the current channel the given user is in. Return empty for no channel.
func (s *RedisPresenceStore) GetPresence(ctx context.Context, uuid string) (string, error) {
	conn := s.redisPool.Get()
	defer conn.Close()

	key := "presence:user:" + uuid

	m, err := redis.StringMap(conn.Do("HGETALL", key))
	if err != nil {
		return "", err
	}

	if m == nil {
		return "", nil
	}

	return m["channel"], nil
}

func (s *RedisPresenceStore) CountInChannel(ctx context.Context, channel string) (int, error) {

	conn := s.redisPool.Get()
	defer conn.Close()

	key := "presence:channel:" + channel

	val, err := redis.Int(conn.Do("SCARD", key))
	if err != nil {
		return 0, err
	}
	return val, nil
}

func (s *RedisPresenceStore) BatchGetPresence(ctx context.Context, users []*entity.User) ([]*entity.User, error) {
	return nil, nil
}
