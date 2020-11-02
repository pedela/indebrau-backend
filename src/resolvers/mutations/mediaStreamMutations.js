const { activeMediaStreamsCache } = require('../../utils/caches');
const { checkUserPermissions } = require('../../utils/checkUserPermissions');
const { createMediaFolder, deleteMediaFolder } = require('../../utils/mediaFileHandling');

const mediaStreamMutations = {
  async createMediaStream(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    // Mind, that it is possible to connect a mediaStream to an already
    // ended brewing process (step). Then, this stream will not be "active".
    let steps = await ctx.prisma.brewingStep.findMany({
      where: {
        AND: [{ brewingProcessId: parseInt(args.brewingProcessId) },
          { name: args.brewingStepName }]
      }
    });
    let createdMediaStream = await ctx.prisma.mediaStream.create({
      data: {
        mediaFilesName: args.mediaFilesName,
        overwrite: args.overwrite,
        updateFrequency: args.updateFrequency,
        brewingStep: { connect: { id: steps[0].id } }
      }
    });
    // update cache (since new stream was added)
    await activeMediaStreamsCache(ctx, true);
    // create folder for media and return
    await createMediaFolder(createdMediaStream.brewingStepId, createdMediaStream.id);
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
      throw new Error(`Media stream with id ${mediaStreamId} does not exist!`);
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
