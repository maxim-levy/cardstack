module.exports = function (cardContext) {
  return [{
    path: '/:type/:id',
    query: {
      filter: {
        type: { exact: ':type' },
        id: { exact: ':id' }
      }
    }
  }, {
    path: '/',
    query: {
      filter: {
        type: { exact: cardContext.data.type },
        id: { exact: cardContext.data.id }
      }
    }
  }];
};