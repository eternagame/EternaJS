export class RNATreeNode {
    public _is_pair: boolean = false;
    public _children: RNATreeNode[] = [];

    public _index_a: number = -1;
    public _index_b: number = -1;

    public _score: number = 0;

    public _x: number = 0;
    public _y: number = 0;

    public _go_x: number = 0;
    public _go_y: number = 0;
}
