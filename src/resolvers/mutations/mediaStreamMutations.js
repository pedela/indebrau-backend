const {
  activeMediaStreamsCache,
  checkUserPermissions,
  deleteMedia
} = require('../../utils');

const mediaStreamMutations = {
  async createMediaStream(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);

    // 1. search for previous active streams with same name and deactivate if exists
    // (arguably, there could be multiple media streams (of multiple brewing processes)
    // recording the same media files. Or, there could be multiple brewing processes per
    // media stream. Same goes for graphs..)
    await ctx.db.mutation.updateManyMediaStreams({
      where: { active: true, mediaFilesName: args.mediaFilesName },
      data: { active: false }
    });
    // 2. create media stream
    const createdMediaStream = await ctx.db.mutation.createMediaStream(
      {
        data: {
          mediaFilesName: args.mediaFilesName,
          updateFrequency: args.updateFrequency,
          overwrite: args.overwrite,
          brewingSteps: { set: args.steps },
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
      '{ mediaFiles {publicIdentifier} }'
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
    // finally, remove media from disk
    for (let i = 0; i < streamMediaFiles.mediaFiles.length; i++) {
      await deleteMedia(streamMediaFiles.mediaFiles[i].publicIdentifier);
    }

    return deletedMediaStream;
  }
};

module.exports = { mediaStreamMutations };
