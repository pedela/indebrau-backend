const { reduceDataEvenly } = require('../../utils/reduceDataEvenly');

const graphType = {
  async graphData(parent, { dataPoints }, ctx) {
    let graphData = await ctx.prisma.graphData.findMany({
      where: { graphId: parent.id },
      orderBy: { time: 'asc' },
    });
    // reduce returned graph data evenly
    return reduceDataEvenly(graphData, dataPoints);
  },
  async brewingStep(parent, args, ctx) {
    return await ctx.prisma.brewingStep.findOne({
      where: { id: parent.brewingStepId }
    });
  }
};

module.exports = { graphType };
