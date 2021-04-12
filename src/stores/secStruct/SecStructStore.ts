import Store from 'stores/store';
import SecStructState from './SecStructState';

export default class SecStructStore extends Store<SecStructState> {
    constructor() {
        super(new SecStructState());
    }
}
