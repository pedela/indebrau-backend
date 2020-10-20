const { reduceDataEvenly } = require('../../utils/reduceDataEvenly');

const graphType = {
  async graphData(parent, { dataPoints }, ctx) {
    let graphData = await ctx.prisma.graphData.findMany({
      where: { graphId: parent.id }
    });
    // reduce returned graph data evenly
    graphData = reduceDataEvenly(graphData, dataPoints);
    return graphData;
  },
  async brewingProcess(parent, args, ctx) {
    let brewingProcess = await ctx.prisma.brewingProcess.findOne({
      where: { id: parent.brewingProcessId }
    });
    return brewingProcess;
  }
};

module.exports = { graphType };
