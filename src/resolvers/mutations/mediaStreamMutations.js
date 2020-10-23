const { activeMediaStreamsCache } = require('../../utils/caches');
const { checkUserPermissions } = require('../../utils/checkUserPermissions');
const { createMediaFolder, deleteMediaFolder } = require('../../utils/mediaFileHandling');

const mediaStreamMutations = {
  async createMediaStream(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    // create media stream
    let createdMediaStream = await ctx.prisma.mediaStream.create(
      {
        data: {
          mediaFilesName: args.mediaFilesName,
          updateFrequency: args.updateFrequency,
          overwrite: args.overwrite,
          brewingStep: {
            connect: {
              id: parseInt(args.brewingStepId)
            }
          }
        }
      }
    );
    // update cache (since new stream was added)
    await activeMediaStreamsCache(ctx, true);
    // create folder for media and return
    await createMediaFolder(args.brewingStepId, createdMediaStream.id);
    // TODO what if media folder creation fails -> Rollback needed!
    return createdMediaStream;
  },

  async deleteMediaStream(parent, { mediaStreamId }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: parseInt(mediaStreamId) };
    let mediaStream;
    // first, get brewing process id of stream
    mediaStream = await ctx.prisma.mediaStream.findOne({ where });
    if (!mediaStream) {
      throw new Error('Media stream with id ' + mediaStreamId + ' does not exist!');
    }
    // now delete stream
    await ctx.prisma.mediaStream.delete({ where });
    // update cache since stream was deleted in db
    await activeMediaStreamsCache(ctx, true);
    // finally, remove media from disk
    await deleteMediaFolder(mediaStream.brewingStepId, mediaStreamId);
    return { message: 'Deleted!' };
  }
};

module.exports = { mediaStreamMutations };
