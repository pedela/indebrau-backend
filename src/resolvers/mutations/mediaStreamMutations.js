const {
  activeMediaStreamsCache,
  checkUserPermissions
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
    const deletedMediaStreamReturn = await ctx.db.mutation.deleteMediaStream(
      { where },
      info
    );
    // update cache since stream was deleted in db
    await activeMediaStreamsCache(ctx, true);

    // todo: delete images from cloudinary!
    if (!deletedMediaStreamReturn) {
      throw new Error('Problem deleting media stream with id: ' + args.id);
    }
    return deletedMediaStreamReturn;
  }
};

module.exports = { mediaStreamMutations };
