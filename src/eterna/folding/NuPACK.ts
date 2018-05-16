// import { Folder } from "./Folder";
//
// // There can be only one statically linked Alchemy library.
// // Consequently, this next instance must be loaded dynamically.
// //
//
// export class NuPACK extends Folder {
// 	public static NAME: string = "eterna.folding.NuPACK";
//
// 	private _ldr:Loader;
// 	private _lib:Object;
//
// 	constructor(loaded_cb: () => void = null) {
// 		super(loaded_cb);
// 		this._lib = null;
// 		this._ldr = new Loader();
// 		this._ldr.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, this.on_complete);
// 		this._ldr.contentLoaderInfo.addEventListener(Event.COMPLETE, this.on_complete);
// 		let ctx:LoaderContext = new LoaderContext();
// 		ctx.applicationDomain = new ApplicationDomain();
// 		let url:string = Application.instance.get_url_base() + "/eterna_resources/nupack.swf";
// 		this._ldr.load(new URLRequest(url), ctx);
// 	}
//
// 	private on_complete(e:Event):void {
// 		let cls:Object = null;
// 		if (e.type != IOErrorEvent.IO_ERROR) {
// 			try {
// 				cls = (<Class>this._ldr.contentLoaderInfo.applicationDomain.getDefinition("cmodule.nupack.CLibInit") );
// 			} catch (e:Error) {
// 				throw new IllegalOperationError("CLibInit definition not found in nupack.swf");
// 			}
// 		}
//
// 		if (cls != null) {
// 			this._clib_inst = new cls();
// 			this._lib = this._clib_inst.init();
//
// 			let cnt:number = 0;
// 			let cb:Function = function(e:Event, filename:string = null):void {
// 				if (e.type != IOErrorEvent.IO_ERROR) {
// 					trace("supplying "+filename);
// 					this._clib_inst.supplyFile(filename, e.target.data);
// 				}
// 				cnt++;
// 				if (cnt == 2) {
// 					this.on_loaded();
// 					this._functional = true;
// 				}
// 			};
// 			let rsc:URLLoader = new URLLoader();
// 			rsc.dataFormat = URLLoaderDataFormat.BINARY;
// 			rsc.addEventListener(IOErrorEvent.IO_ERROR, function(e:Event) :void { cb(e); });
// 			rsc.addEventListener(Event.COMPLETE, function(e:Event) :void { cb(e, "rna1995.dG"); });
// 			let url:string = Application.instance.get_url_base() + "/eterna_resources/nupack_params/rna1995.dG";
// 			rsc.load(new URLRequest(url));
//
// 			let rsc2:URLLoader = new URLLoader();
// 			rsc2.dataFormat = URLLoaderDataFormat.BINARY;
// 			rsc2.addEventListener(IOErrorEvent.IO_ERROR, function(e:Event) :void { cb(e); });
// 			rsc2.addEventListener(Event.COMPLETE, function(e:Event) :void { cb(e, "rna1995.dH"); });
// 			url = Application.instance.get_url_base() + "/eterna_resources/nupack_params/rna1995.dH";
// 			rsc2.load(new URLRequest(url));
//
// 		} else {
// 			this.on_loaded();
// 		}
// 	}
//
// 	private fold_sequence_alch(seq:any[], str:string = null, temp:number = 37):any[] {
//
// 		let leng:number = seq.length;
// 		let x:number;
// 		let seqRet:any[];
// 		let seqStr:string;
// 		let structStr:string;
//
//
// 		if(str == null)
// 			structStr = "";
// 		else
// 			structStr = str;
//
// 		seqStr = "";
// 		for (x = 0; x < leng; x++) {
//
// 			switch (seq[x]) {
// 				case EPars.RNABASE_ADENINE:
// 					seqStr += "A";
// 					break;
// 				case EPars.RNABASE_CYTOSINE:
// 					seqStr += "C";
// 					break;
// 				case EPars.RNABASE_GUANINE:
// 					seqStr += "G";
// 					break;
// 				case EPars.RNABASE_URACIL:
// 					seqStr += "U";
// 					break;
// 				default:
// 					trace("bad nucleotide");
// 			}
// 		}
//
// 		seqRet = this._lib.fullAlchFold(1, new Array(temp.toString()), seqStr, structStr);
// 		trace("done folding");
// 		return EPars.parenthesis_to_pair_array(seqRet[1]);
//
// 	}
//
// 	private fold_sequence_alch_with_binding_site(seq:any[], i:number, p:number, j:number, q:number, bonus:number, temp:number=37):any[] {
// 		let leng:number = seq.length;
// 		let x:number;
// 		let seqRet:any[];
// 		let seqStr:string;
// 		let structStr:string = "";
//
// 		seqStr = "";
// 		for (x = 0; x < leng; x++) {
//
// 			switch (seq[x]) {
// 				case EPars.RNABASE_ADENINE:
// 					seqStr += "A";
// 					break;
// 				case EPars.RNABASE_CYTOSINE:
// 					seqStr += "C";
// 					break;
// 				case EPars.RNABASE_GUANINE:
// 					seqStr += "G";
// 					break;
// 				case EPars.RNABASE_URACIL:
// 					seqStr += "U";
// 					break;
// 				default:
// 					trace("bad nucleotide");
// 			}
// 		}
// 		/// type "3" for switch fold
// 		seqRet = this._lib.fullAlchFold(3, [i, p, j, q, -bonus], seqStr, structStr);
//
// 		return EPars.parenthesis_to_pair_array(seqRet[1]);
// 	}
//
// 	private cofold_sequence_alch(seq:any[], str:string = null, temp:number = 37):any[] {
//
// 		let leng:number = seq.length;
// 		let x:number;
// 		let seqRet:any[];
// 		let seqStr:string;
// 		let structStr:string;
//
//
// 		if(str == null)
// 			structStr = "";
// 		else
// 			structStr = str;
//
// 		seqStr = "";
// 		for (x = 0; x < leng; x++) {
//
// 			switch (seq[x]) {
// 				case EPars.RNABASE_CUT:
// 					seqStr += "&";
// 					break;
// 				case EPars.RNABASE_ADENINE:
// 					seqStr += "A";
// 					break;
// 				case EPars.RNABASE_CYTOSINE:
// 					seqStr += "C";
// 					break;
// 				case EPars.RNABASE_GUANINE:
// 					seqStr += "G";
// 					break;
// 				case EPars.RNABASE_URACIL:
// 					seqStr += "U";
// 					break;
// 				default:
// 					trace("bad nucleotide");
// 			}
// 		}
//
// 		seqRet = this._lib.fullAlchFold(4, new Array(temp.toString()), seqStr, structStr);
// 		trace("done cofolding");
// 		return EPars.parenthesis_to_pair_array(seqRet[1]);
//
// 	}
//
// 	private cofold_sequence_alch_with_binding_site(seq:any[], str:string, i:number, p:number, j:number, q:number, bonus:number, temp:number=37):any[] {
//
// 		let leng:number = seq.length;
// 		let x:number;
// 		let seqRet:any[];
// 		let seqStr:string = "";
// 		let structStr:string = "";
//
//
// 		if(str == null)
// 			structStr = "";
// 		else
// 			structStr = str;
//
// 		for (x = 0; x < leng; x++) {
//
// 			switch (seq[x]) {
// 				case EPars.RNABASE_CUT:
// 					seqStr += "&";
// 					break;
// 				case EPars.RNABASE_ADENINE:
// 					seqStr += "A";
// 					break;
// 				case EPars.RNABASE_CYTOSINE:
// 					seqStr += "C";
// 					break;
// 				case EPars.RNABASE_GUANINE:
// 					seqStr += "G";
// 					break;
// 				case EPars.RNABASE_URACIL:
// 					seqStr += "U";
// 					break;
// 				default:
// 					trace("bad nucleotide");
// 			}
// 		}
//
// 		seqRet = this._lib.fullAlchFold(5, [i, p, j, q, -bonus], seqStr, structStr);
// 		trace("done cofolding_wbs");
// 		return EPars.parenthesis_to_pair_array(seqRet[1]);
//
// 	}
//
// 	/*override*/ public can_dot_plot():boolean {
// 		return true;
// 	}
//
// 	/*override*/ public get_dot_plot(seq:any[], pairs:any[], temp:number=37):any[] {
//
// 		let key:Object = {primitive:"dotplot", seq:seq, pairs:pairs, temp:temp};
// 		let ret_array:any[] = this.get_cache(key);
// 		if (ret_array != null) {
// 			trace("dotplot cache hit");
// 			return ret_array.slice();
// 		}
//
// 		let struct_str:string ="";
// 		let seq_str:string = EPars.sequence_array_to_string(seq);
// 		ret_array = [];
// 		/*let dummy_ret:Array =*/ this._lib.fullAlchFold(2, [temp.toString(), ret_array], seq_str, struct_str);
//
// 		this.put_cache(key, ret_array.slice());
// 		return ret_array;
// 	}
//
// 	/*override*/ public get_folder_name():string {
// 		return NuPACK.NAME;
// 	}
//
// 	/*override*/ public can_score_structures():boolean {
// 		return true;
// 	}
//
// 	/*override*/ public score_structures(seq:any[], pairs:any[], temp:number = 37, nodes:any[] = null):number {
// 		let ii :number = 0;
//
// 		let key:Object = {primitive:"score", seq:seq, pairs:pairs, temp:temp};
// 		let result:Object = this.get_cache(key);
// 		if (result != null) {
// 			// trace("score cache hit");
// 			if (nodes != null) {
// 				for (ii = 0; ii < result.nodes.length; ii++) nodes.push(result.nodes[ii]);
// 			}
// 			return result.ret[0] * 100;
// 		}
//
// 		let ret:any[] = this._lib.fullAlchEval(temp, EPars.sequence_array_to_string(seq), EPars.pairs_array_to_parenthesis(pairs), nodes);
//
// 		let cut:number = seq.lastIndexOf(EPars.RNABASE_CUT);
// 		if (cut >= 0 && nodes != null) {
// 			if (nodes[0] != -2 || nodes.length == 2 || (nodes[0] == -2 && nodes[2] != -1)) {
// 				// we just scored a duplex that wasn't one, so we have to redo it properly
// 				let seqA:any[] = seq.slice(0, cut);
// 				let pairsA:any[] = pairs.slice(0, cut);
// 				let nodesA:any[] = [];
// 				let retA:number = this.score_structures(seqA, pairsA, temp, nodesA);
//
// 				let seqB:any[] = seq.slice(cut+1);
// 				let pairsB:any[] = pairs.slice(cut+1);
// 				for (ii = 0; ii < pairsB.length; ii++) {
// 					if (pairsB[ii] >= 0) pairsB[ii] -= (cut+1);
// 				}
// 				let nodesB:any[] = [];
// 				let retB:number = this.score_structures(seqB, pairsB, temp, nodesB);
//
// 				if (nodesA[0] >= 0 || nodesB[0] != -1) {
// 					throw new Error("Something went terribly wrong in score_structures()");
// 				}
//
// 				nodes.splice(0); // make empty
// 				for (ii = 0; ii < nodesA.length; ii++) nodes[ii] = nodesA[ii];
// 				if (nodes[0] == -2) {
// 					nodes[3] += nodesB[1]; // combine the free energies of the external loops
// 				} else {
// 					nodes[1] += nodesB[1]; // combine the free energies of the external loops
// 				}
// 				for (ii = 2; ii < nodesB.length; ii += 2) {
// 					nodes.push(nodesB[ii] + cut+1);
// 					nodes.push(nodesB[ii+1]);
// 				}
//
// 				ret[0] = (retA + retB) / 100;
// 			} else {
// 				cut = 0;
// 				for (ii = 0; ii < nodes.length; ii += 2) {
// 					if (seq[ii/2] == EPars.RNABASE_CUT)
// 						cut++;
// 					else
// 						nodes[ii] += cut;
// 				}
// 			}
// 		}
//
// 		if (nodes != null) {
// 			result = {ret:ret.slice(), nodes:nodes.slice()};
// 			this.put_cache(key, result);
// 		}
//
// 		return ret[0] * 100;
// 	}
//
// 	/*override*/ public fold_sequence(seq:any[], second_best_pairs:any[], desired_pairs:string = null, temp:number = 37):any[] {
// 		let key:Object = {primitive:"eterna.folding", seq:seq, second_best_pairs:second_best_pairs, desired_pairs:desired_pairs, temp:temp};
// 		let pairs:any[] = this.get_cache(key);
// 		if (pairs != null) {
// 			// trace("fold cache hit");
// 			return pairs.slice();
// 		}
//
// 		pairs = this.fold_sequence_alch(seq, desired_pairs, temp);
// 		this.put_cache(key, pairs.slice());
// 		return pairs;
// 	}
//
// 	/*override*/ public fold_sequence_with_binding_site(seq:any[], target_pairs:any[], binding_site:any[], bonus:number, version:number = 1.0, temp:number = 37):any[] {
//
// 		let key:Object = {primitive:"fold_aptamer", seq:seq, target_pairs:target_pairs, binding_site:binding_site, bonus:bonus, version:version, temp:temp};
// 		let pairs:any[] = this.get_cache(key);
// 		if (pairs != null) {
// 			// trace("fold_aptamer cache hit");
// 			return pairs.slice();
// 		}
//
// 		let site_groups:any[] = [];
// 		let last_index:number = -1;
// 		let current_group:any[] = [];
//
// 		for (let jj:number=0; jj<binding_site.length; jj++) {
// 			if (last_index < 0 || binding_site[jj] - last_index  == 1) {
// 				current_group.push(binding_site[jj]);
// 				last_index = binding_site[jj];
// 			} else {
// 				site_groups.push(current_group);
// 				current_group = [];
// 				current_group.push(binding_site[jj]);
// 				last_index = binding_site[jj];
// 			}
// 		}
// 		if (current_group.length >0){
// 			site_groups.push(current_group);
// 		}
//
// 		pairs = this.fold_sequence_alch_with_binding_site(seq, site_groups[0][0], site_groups[0][site_groups[0].length-1], site_groups[1][site_groups[1].length-1], site_groups[1][0], bonus, temp);
//
// 		this.put_cache(key, pairs.slice());
// 		return pairs;
// 	}
//
// 	/*override*/ public cofold_sequence(seq:any[], second_best_pairs:any[], malus:number = 0, desired_pairs:string = null, temp:number = 37):any[] {
// 		let cut:number = seq.indexOf(EPars.RNABASE_CUT);
// 		if (cut < 0) {
// 			throw new Error("Missing cutting point");
// 		}
//
// 		let key:Object = {primitive:"cofold", seq:seq, second_best_pairs:second_best_pairs, malus:malus, desired_pairs:desired_pairs, temp:temp};
// 		let co_pairs:any[] = this.get_cache(key);
// 		if (co_pairs != null) {
// 			// trace("cofold cache hit");
// 			return co_pairs.slice();
// 		}
//
// 		// FIXME: what about desired_pairs? (forced structure)
// 		let seqA:any[] = seq.slice(0, cut);
// 		let pairsA:any[] = this.fold_sequence(seqA, null, null, temp);
// 		let nodesA:any[] = [];
// 		let feA:number = this.score_structures(seqA, pairsA, temp, nodesA);
//
// 		let seqB:any[] = seq.slice(cut+1);
// 		let pairsB:any[] = this.fold_sequence(seqB, null, null, temp);
// 		let nodesB:any[] = [];
// 		let feB:number = this.score_structures(seqB, pairsB, temp, nodesB);
//
// 		co_pairs = this.cofold_sequence_alch(seq, desired_pairs, temp);
// 		let co_nodes:any[] = [];
// 		let co_fe:number = this.score_structures(seq, co_pairs, temp, co_nodes);
//
// 		if (co_fe + malus >= feA + feB) {
// 			let struc:string = EPars.pairs_array_to_parenthesis(pairsA) + "&" + EPars.pairs_array_to_parenthesis(pairsB);
// 			co_pairs = EPars.parenthesis_to_pair_array(struc);
// 		}
//
// 		this.put_cache(key, co_pairs.slice());
// 		return co_pairs;
// 	}
//
// 	/*override*/ public can_cofold_with_binding_site():boolean {
// 		return true;
// 	}
//
// 	private binding_site_formed(pairs:any[], groups:any[]):boolean {
// 		if (pairs[groups[0][0]] != groups[1][groups[1].length-1]) return false;
// 		if (pairs[groups[0][groups[0].length-1]] != groups[1][0]) return false;
// 		let ii:number;
// 		for (ii = 1; ii < groups[0].length-1; ii++)
// 			if (pairs[groups[0][ii]] != -1) return false;
// 		for (ii = 1; ii < groups[1].length-1; ii++)
// 			if (pairs[groups[1][ii]] != -1) return false;
//
// 		return true;
// 	}
//
// 	/*override*/ public cofold_sequence_with_binding_site(seq:any[], binding_site:any[], bonus:number, desired_pairs:string = null, malus:number = 0, temp:number = 37):any[] {
// 		let cut:number = seq.indexOf(EPars.RNABASE_CUT);
// 		if (cut < 0) {
// 			throw new Error("Missing cutting point");
// 		}
//
// 		let key:Object = {primitive:"cofold_aptamer", seq:seq, malus:malus, desired_pairs:desired_pairs, binding_site:binding_site, bonus:bonus, temp:temp};
// 		let co_pairs:any[] = this.get_cache(key);
// 		if (co_pairs != null) {
// 			// trace("cofold_aptamer cache hit");
// 			return co_pairs.slice();
// 		}
//
// 		// IMPORTANT: assumption is that the binding site is in segment A
// 		// FIXME: what about desired_pairs? (forced structure)
//
// 		let site_groups:any[] = [];
// 		let last_index:number = -1;
// 		let current_group:any[] = [];
//
// 		for (let jj:number = 0; jj < binding_site.length; jj++) {
// 			if (last_index < 0 || binding_site[jj] - last_index == 1) {
// 				current_group.push(binding_site[jj]);
// 				last_index = binding_site[jj];
// 			} else {
// 				site_groups.push(current_group);
// 				current_group = [];
// 				current_group.push(binding_site[jj]);
// 				last_index = binding_site[jj];
// 			}
// 		}
// 		if (current_group.length > 0) {
// 			site_groups.push(current_group);
// 		}
//
// 		let seqA:any[] = seq.slice(0, cut);
// 		let pairsA:any[] = this.fold_sequence_with_binding_site(seqA, null, binding_site, bonus, 2.5, temp);
// 		let nodesA:any[] = [];
// 		let feA:number = this.score_structures(seqA, pairsA, temp, nodesA);
// 		if (this.binding_site_formed(pairsA, site_groups)) feA += bonus;
//
// 		let seqB:any[] = seq.slice(cut+1);
// 		let pairsB:any[] = this.fold_sequence(seqB, null, null, temp);
// 		let nodesB:any[] = [];
// 		let feB:number = this.score_structures(seqB, pairsB, temp, nodesB);
//
// 		co_pairs = this.cofold_sequence_alch_with_binding_site(seq, desired_pairs, site_groups[0][0], site_groups[0][site_groups[0].length-1], site_groups[1][site_groups[1].length-1], site_groups[1][0], bonus, temp);
// 		let co_nodes:any[] = [];
// 		let co_fe:number = this.score_structures(seq, co_pairs, temp, co_nodes);
// 		if (this.binding_site_formed(co_pairs, site_groups)) co_fe += bonus;
//
// 		if (co_fe + malus >= feA + feB) {
// 			let struc:string = EPars.pairs_array_to_parenthesis(pairsA) + "&" + EPars.pairs_array_to_parenthesis(pairsB);
// 			co_pairs = EPars.parenthesis_to_pair_array(struc);
// 		}
//
// 		this.put_cache(key, co_pairs.slice());
// 		return co_pairs;
// 	}
//
//
// 	/*override*/ public can_multifold():boolean {
// 		return true;
// 	}
//
// 	private cofold_seq2(seq:any[], second_best_pairs:any[], desired_pairs:string = null, temp:number = 37):any[] {
// 		let key:Object = {primitive:"cofold2", seq:seq, second_best_pairs:second_best_pairs, desired_pairs:desired_pairs, temp:temp};
// 		let co_pairs:any[] = this.get_cache(key);
// 		if (co_pairs != null) {
// 			// trace("cofold2 cache hit");
// 			return co_pairs.slice();
// 		}
//
// 		co_pairs = this.cofold_sequence_alch(seq, desired_pairs, temp);
//
// 		this.put_cache(key, co_pairs.slice());
// 		return co_pairs;
// 	}
//
// 	/*override*/ public multifold(seq:any[], second_best_pairs:any[], oligos:any[], desired_pairs:string = null, temp:number = 37):Object {
//
// 		let key:Object = {primitive:"multifold", seq:seq, second_best_pairs:second_best_pairs, oligos:oligos, desired_pairs:desired_pairs, temp:temp};
// 		let mfold:Object = this.get_cache(key);
// 		if (mfold != null) {
// 			// trace("multifold cache hit");
// 			return mfold;
// 		}
//
// 		mfold = {};
// 		mfold['pairs'] = null;
// 		mfold['order'] = null;
// 		mfold['count'] = -1;
//
// 		let best_fe:number = 1000000;
// 		let order:any[] = [];
// 		let num_oligo:number = oligos.length;
// 		let ii:number;
//
// 		for (ii = 0; ii < num_oligo; ii++) order.push(ii);
//
// 		let more:boolean;
// 		do {
// 			for (ii = num_oligo; ii >= 0; ii--) {
// 				let jj:number;
// 				let ms_seq:any[] = seq.slice();
// 				for (jj = 0; jj < ii; jj++) {
// 					ms_seq.push(EPars.RNABASE_CUT);
// 					ms_seq = ms_seq.concat(oligos[order[jj]].seq);
// 				}
// 				let ms_pairs:any[];
// 				if (ii == 0)
// 					ms_pairs = this.fold_sequence(ms_seq, null, null, temp);
// 				else
// 					ms_pairs = this.cofold_seq2(ms_seq, null, null, temp);
// 				let ms_nodes:any[] = [];
// 				let ms_fe :number = this.score_structures(ms_seq, ms_pairs, temp, ms_nodes);
// 				for (jj = 0; jj < ii; jj++) {
// 					ms_fe += oligos[order[jj]].malus;
// 				}
// 				for (jj = ii; jj < num_oligo; jj++) {
// 					let s_pairs:any[] = this.fold_sequence(oligos[order[jj]].seq, null, null, temp);
// 					let s_nodes:any[] = [];
// 					let s_fe:number = this.score_structures(oligos[order[jj]].seq, s_pairs, temp, s_nodes);
//
// 					let struc:string = EPars.pairs_array_to_parenthesis(ms_pairs) + "&" + EPars.pairs_array_to_parenthesis(s_pairs);
// 					ms_pairs = EPars.parenthesis_to_pair_array(struc);
// 					ms_fe += s_fe;
// 				}
//
// 				if (ms_fe < best_fe) {
// 					best_fe = ms_fe;
// 					mfold.pairs = ms_pairs.slice();
// 					mfold.order = order.slice();
// 					mfold.count = ii;
// 				}
// 			}
//
// 			more = Utility.next_perm(order);
// 		} while(more);
//
// 		this.put_cache(key, mfold);
// 		return mfold;
// 	}
//
// 	/*override*/ public multifold_unroll(seq:any[], second_best_pairs:any[], oligos:any[], desired_pairs:string = null, temp:number = 37):any[] {
//
// 		let ops:any[] = [];
//
// 		let order:any[] = [];
// 		let num_oligo:number = oligos.length;
// 		let ii:number;
//
// 		for (ii = 0; ii < num_oligo; ii++) order.push(ii);
//
// 		for (ii = 0; ii < num_oligo; ii++) {
// 			ops.push({objref:this, fn:this.fold_sequence, arg:[oligos[ii].seq, null, null, temp]});
// 		}
//
// 		let more:boolean;
// 		do {
// 			for (ii = num_oligo; ii >= 0; ii--) {
// 				let jj:number;
// 				let ms_seq:any[] = seq.slice();
// 				for (jj = 0; jj < ii; jj++) {
// 					ms_seq.push(EPars.RNABASE_CUT);
// 					ms_seq = ms_seq.concat(oligos[order[jj]].seq);
// 				}
//
// 				if (ii == 0)
// 					ops.push({objref:this, fn:this.fold_sequence, arg:[ms_seq, null, null, temp]});
// 				else
// 					ops.push({objref:this, fn:this.cofold_seq2, arg:[ms_seq, null, null, temp]});
// 			}
//
// 			more = Utility.next_perm(order);
// 		} while(more);
//
// 		ops.push({objref:this, fn:this.multifold, arg:[seq, second_best_pairs, oligos, desired_pairs, temp]});
// 		return ops;
// 	}
//
// }
