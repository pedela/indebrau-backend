const { reduceDataEvenly } = require('../../utils/reduceDataEvenly');
const mediaStreamType = {
  async mediaFiles(parent, { dataPoints }, ctx) {
    let mediaFiles = await ctx.prisma.mediaFile.findMany({
      where: { mediaStreamId: parent.id }
    });
    // reduce returned files evenly
    mediaFiles = reduceDataEvenly(mediaFiles, dataPoints);
    return mediaFiles;
  },

  async brewingProcess(parent, args, ctx) {
    let brewingProcess = await ctx.prisma.brewingProcess.findOne({
      where: { id: parent.brewingProcessId }
    });
    return brewingProcess;
  }
};

module.exports = { mediaStreamType };
