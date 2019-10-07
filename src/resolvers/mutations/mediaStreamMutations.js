const {
  activeMediaStreamsCache,
  checkUserPermissions,
  deleteMedia
} = require('../../utils');

const mediaStreamMutations = {
  async createMediaStream(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);

    // 1. search for previous active streams for this camera and update if exists
    await ctx.db.mutation.updateManyMediaStreams({
      where: { active: true, name: args.name },
      data: { active: false }
    });
    // 2. create media stream
    const createdMediaStream = await ctx.db.mutation.createMediaStream(
      {
        data: {
          name: args.name,
          updateFrequency: args.updateFrequency,
          active: true,
          brewingProcess: {
            connect: {
              id: args.brewingProcessId
            }
          }
        }
      },
      info
    );
    // 3. update cache (since new stream was added) and return
    await activeMediaStreamsCache(ctx, true);
    if (!createdMediaStream) {
      throw new Error('Problem creating new media stream');
    }
    return createdMediaStream;
  },

  async deleteMediaStream(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: args.id };
    // first get mediaFile list of stream
    const streamMediaFiles = await ctx.db.query.mediaStream(
      { where },
      '{ mediaFiles {publicId} }'
    );
    // now delete stream
    const deletedMediaStream = await ctx.db.mutation.deleteMediaStream(
      { where },
      info
    );
    // check, if stream was deleted from database
    if (!deletedMediaStream) {
      throw new Error('Problem deleting media stream with id: ' + args.id);
    }
    // update cache since stream was deleted in db
    await activeMediaStreamsCache(ctx, true);
    // finally, remove media from cloudinary
    for (var i = 0; i < streamMediaFiles.mediaFiles.length; i++) {
      console.log(streamMediaFiles.mediaFiles[i].publicId);
      deleteMedia(streamMediaFiles.mediaFiles[i].publicId);
    }

    return deletedMediaStream;
  }
};

module.exports = { mediaStreamMutations };
