package user

import (
	"context"
	"encoding/json"
	"os"

	"github.com/domino14/liwords/pkg/apiserver"
	"github.com/rs/zerolog/log"
	"github.com/twitchtv/twirp"

	pb "github.com/domino14/liwords/rpc/api/proto/user_service"
)

type ProfileService struct {
	userStore Store
}

func NewProfileService(u Store) *ProfileService {
	return &ProfileService{userStore: u}
}

func (ps *ProfileService) GetRatings(ctx context.Context, r *pb.RatingsRequest) (*pb.RatingsResponse, error) {
	user, err := ps.userStore.Get(ctx, r.Username)
	if err != nil {
		return nil, twirp.NewError(twirp.InvalidArgument, err.Error())
	}
	ratings := user.Profile.Ratings

	b, err := json.Marshal(ratings)
	if err != nil {
		return nil, twirp.InternalErrorWith(err)
	}
	return &pb.RatingsResponse{
		Json: string(b),
	}, nil
}

func (ps *ProfileService) GetStats(ctx context.Context, r *pb.StatsRequest) (*pb.StatsResponse, error) {
	user, err := ps.userStore.Get(ctx, r.Username)
	if err != nil {
		return nil, twirp.NewError(twirp.InvalidArgument, err.Error())
	}
	stats := user.Profile.Stats

	b, err := json.Marshal(stats)
	if err != nil {
		return nil, twirp.InternalErrorWith(err)
	}
	return &pb.StatsResponse{
		Json: string(b),
	}, nil
}

func (ps *ProfileService) GetProfile(ctx context.Context, r *pb.ProfileRequest) (*pb.ProfileResponse, error) {
	user, err := ps.userStore.Get(ctx, r.Username)
	if err != nil {
		return nil, twirp.NewError(twirp.InvalidArgument, err.Error())
	}

	ratings := user.Profile.Ratings
	ratjson, err := json.Marshal(ratings)
	if err != nil {
		return nil, twirp.InternalErrorWith(err)
	}

	stats := user.Profile.Stats
	statjson, err := json.Marshal(stats)
	if err != nil {
		return nil, twirp.InternalErrorWith(err)
	}

	return &pb.ProfileResponse{
		FirstName:   user.Profile.FirstName,
		LastName:    user.Profile.LastName,
		CountryCode: user.Profile.CountryCode,
		Title:       user.Profile.Title,
		About:       user.Profile.About,
		RatingsJson: string(ratjson),
		StatsJson:   string(statjson),
		UserId:      user.UUID,
		AvatarUrl:	 user.AvatarUrl(),
	}, nil
}

func (ps *ProfileService) GetUsersGameInfo(ctx context.Context, r *pb.UsersGameInfoRequest) (*pb.UsersGameInfoResponse, error) {
	var infos []*pb.UserGameInfo

 	for _, uuid := range r.Uuids {
		user, err := ps.userStore.GetByUUID(ctx, uuid)
		if err == nil {
			infos = append(infos, &pb.UserGameInfo {
				Uuid: uuid,
				AvatarUrl: user.AvatarUrl(),
			 	Title: user.Profile.Title,
			})
		}
 	}

	return &pb.UsersGameInfoResponse{
		Infos: infos,
	}, nil
}

func (ps *ProfileService) UpdateProfile(ctx context.Context, r *pb.UpdateProfileRequest) (*pb.UpdateProfileResponse, error) {
	// This view requires authentication.
	sess, err := apiserver.GetSession(ctx)
	if err != nil {
		return nil, err
	}

	user, err := ps.userStore.Get(ctx, sess.Username)
	if err != nil {
		log.Err(err).Msg("getting-user")
		// The username should maybe not be in the session? We can't change
		// usernames easily.
		return nil, twirp.InternalErrorWith(err)
	}

	err = ps.userStore.SetAbout(ctx, user.UUID, r.About)
	if err != nil {
		return nil, twirp.InternalErrorWith(err)
	}

	return &pb.UpdateProfileResponse{
	}, nil
}

func (ps *ProfileService) UpdateAvatar(ctx context.Context, r *pb.UpdateAvatarRequest) (*pb.UpdateAvatarResponse, error) {
	// This view requires authentication.
	sess, err := apiserver.GetSession(ctx)
	if err != nil {
		return nil, err
	}

	user, err := ps.userStore.Get(ctx, sess.Username)
	if err != nil {
		log.Err(err).Msg("getting-user")
		// The username should maybe not be in the session? We can't change
		// usernames easily.
		return nil, twirp.InternalErrorWith(err)
	}

	// Store the file with a name reflective of the user's UUID
	filename := user.UUID + ".jpg"
	avatarUrl := "file:///Users/slipkin/Projects/woogles/liwords/" + filename

	f, createErr := os.Create(filename)
	if createErr != nil {
		return nil, twirp.InternalErrorWith(createErr)
	}

	_, writeErr := f.WriteString(string(r.JpgData))
	if writeErr != nil {
		return nil, twirp.InternalErrorWith(writeErr)
	}

	// Remember the filename in the database
	updateErr := ps.userStore.SetAvatarUrl(ctx, user.UUID, avatarUrl)
	if updateErr != nil {
		return nil, twirp.InternalErrorWith(updateErr)
	}

	return &pb.UpdateAvatarResponse{
		AvatarUrl: avatarUrl,
	}, nil
}
