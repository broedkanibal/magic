/* B med stolar, två spelare: Me · Erik · Both. Samma rörelse, bara upp och ner. */
var CFG2 = { opps: ['erik'], ids: ['me', 'erik', 'all'], def: 'all', allLabel: 'Both' };
class Component extends DCLogic {
  componentDidMount() { var self = this; v2Mount(this, function (e) { return seatKeys(self, CFG2, e); }); }
  componentWillUnmount() { v2Unmount(this); clearTimeout(this._fanT); clearTimeout(this._bumpT); clearTimeout(this._landT); }
  renderVals() { return Object.assign(v2Common(this), seatLayout(this, CFG2)); }
}
