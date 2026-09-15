/* B med stolar, fyra spelare: kolumnerna i den ordning de sitter — Sara
   till vänster, Erik mitt emot, Linus till höger — och växeln i samma ordning. */
var CFG4 = { opps: ['sara', 'erik', 'linus'], ids: ['me', 'sara', 'erik', 'linus', 'all'], def: 'all', allLabel: 'All' };
class Component extends DCLogic {
  componentDidMount() { var self = this; v2Mount(this, function (e) { return seatKeys(self, CFG4, e); }); }
  componentWillUnmount() { v2Unmount(this); clearTimeout(this._fanT); clearTimeout(this._bumpT); clearTimeout(this._landT); }
  renderVals() { return Object.assign(v2Common(this), seatLayout(this, CFG4)); }
}
