const { reduceDataEvenly } = require('../../utils/reduceDataEvenly');
const mediaStreamType = {
  async mediaFiles(parent, { dataPoints }, ctx) {
    let mediaFiles = await ctx.prisma.mediaFile.findMany({
      where: { mediaStreamId: parent.id }, orderBy: { time: 'asc' },
    });
    // reduce returned files evenly
    return reduceDataEvenly(mediaFiles, dataPoints);
  },

  async brewingStep(parent, args, ctx) {
    return await ctx.prisma.brewingStep.findOne({
      where: { id: parent.brewingStep }
    });
  }
};

module.exports = { mediaStreamType };
