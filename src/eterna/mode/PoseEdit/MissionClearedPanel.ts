// import {Text} from "pixi.js";
// import {ContainerObject} from "../../../flashbang/objects/ContainerObject";
// import {EternaURL} from "../../net/EternaURL";
// import {RankScroll} from "../../rank/RankScroll";
// import {BitmapManager} from "../../resources/BitmapManager";
// import {GameButton} from "../../ui/GameButton";
// import {GamePanel} from "../../ui/GamePanel";
// import {Fonts} from "../../util/Fonts";
// import {UDim} from "../../util/UDim";
//
// export class MissionClearedPanel extends ContainerObject {
//     public constructor() {
//         super();
//
//         // this._tfLoading = Fonts.std_regular("Submitting your design - please wait...", 20).bold().build();
//         // this.container.addChild(this._tfLoading);
//         // this._tfLoading.set_animator(new GameAnimatorFader(1, 0, 0.3, false, true));
//         // this._tfLoading.set_pos(new UDim(0.5, 0.5, -150, 220));
//         // this.add_object(this._tfLoading);
//
//         this._closeButton = new GameButton()
//             .allStates(BitmapManager.ImgCross)
//             .tooltip("Stay in this puzzle and review your design");
//         this._closeButton.set_pos(new UDim(1.0, 0.0, -10 - this._closeButton.button_width(), 10));
//         this._closeButton.set_click_callback(this.close_dialog);
//         this._closeButton.set_use_response_animation(false);
//         this.add_object(this._closeButton);
//
//         this._panel = new GamePanel(1);
//         this._panel.visible = false;
//         this.add_object(this._panel);
//
//         let tf: TextFormat = Fonts.std_light(36, false);
//         this._title = new Text(tf);
//         this._title.set_text_color(0xFFCC00);
//         this._title.set_text("Mission Accomplished!", true);
//         this._panel.add_object(this._title);
//
//         tf = Fonts.std_regular(20, false);
//         this._info_text = new Text(tf);
//         this._panel.add_object(this._info_text);
//
//         this._heading = new GamePanel(0, 1.0, 0x2D4159);
//         this._panel.add_object(this._heading);
//
//         tf = Fonts.std_bold(14, true);
//         this._hdr_player = new Text(tf);
//         this._hdr_player.set_text("PLAYER");
//         this._hdr_player.set_pos(new UDim(0, 0, 10, 0));
//         this._heading.add_object(this._hdr_player);
//
//         let hdr_rank: Text = new Text(tf);
//         hdr_rank.set_text("RANK");
//         hdr_rank.set_pos(new UDim(0, 0, 10 + 130, 0));
//         this._heading.add_object(hdr_rank);
//
//         let hdr_coin: Text = new Text(tf);
//         hdr_coin.set_text("POINTS");
//         hdr_coin.set_pos(new UDim(0, 0, 10 + 130 + 85, 0));
//         this._heading.add_object(hdr_coin);
//
//         tf = Fonts.std_regular(16, false);
//         this._science_text = new Text(tf);
//         this._panel.add_object(this._science_text);
//
//         this._next_button = new GameButton(14);
//         this._next_button.set_text("NEXT PUZZLE");
//         this._next_button.set_pos(new UDim(0.5, 1.0, -10 - this._next_button.button_width(), -20 - this._next_button.button_height()));
//         this._next_button.set_click_callback(this.next_puzzle);
//         this._next_button.set_states();
//         this._next_button.set_style("nova");
//         this._next_button.set_use_response_animation(false);
//         this.add_object(this._next_button);
//
//         this._rankscroll = null;
//         this._next_cb = null;
//         this._close_cb = null;
//
//         this.setup_screen();
//     }
//
//     public reset(): void {
//         if (this._rankscroll != null) {
//             this._panel.remove_object(this._rankscroll);
//             this._rankscroll = null;
//         }
//
//         this._tfLoading.visible = true;
//         this._panel.visible = false;
//     }
//
//     public setup_screen(infotxt: string = null, moretxt: string = null): void {
//
//         let style: StyleSheet;
//         if (infotxt == null || moretxt == null) {
//             style = new StyleSheet;
//             style.setStyle(".centered", {
//                 textAlign: 'center'
//             });
//             style.setStyle(".inline", {
//                 display: 'inline'
//             });
//         }
//
//         if (infotxt == null) {
//             this._info_text.set_text("You have solved the puzzle, congratulations!", true);
//         } else {
//             this._info_text.set_use_style(true);
//             this._info_text.GetTextBox().multiline = true;
//             this._info_text.GetTextBox().styleSheet = style;
//             this._info_text.set_text(infotxt, true);
//         }
//
//         if (moretxt == null) {
//             this._science_text.visible = false;
//         } else {
//             this._science_text.visible = true;
//             this._science_text.set_use_style(true);
//             this._science_text.GetTextBox().multiline = true;
//             this._science_text.GetTextBox().styleSheet = style;
//             this._science_text.set_text(moretxt, true);
//         }
//
//         this.on_resize();
//     }
//
//     public set_callbacks(next_cb: Function, close_cb: Function): void {
//         if (next_cb != null) {
//             this._next_button.set_text("NEXT PUZZLE");
//             this._next_cb = next_cb;
//         } else {
//             this._next_button.set_text("WHAT'S NEXT?");
//             this._next_cb = MissionClearedPanel.go_to_feed;
//         }
//
//         this._close_cb = close_cb;
//     }
//
//     public create_rankscroll(ranks: any[], player: PlayerRank, new_points: number, new_rank: number): void {
//
//         if (this._rankscroll != null) {
//             this._panel.remove_object(this._rankscroll);
//         }
//
//         // Create instance
//         this._rankscroll = new RankScroll(ranks, player, new_points, new_rank);
//         this._rankscroll.alpha = 0;
//         this._rankscroll.set_animator(new GameAnimatorFader(0, 1, 0.5, false));
//         this._panel.add_object(this._rankscroll);
//         this.on_resize();
//
//         // Execute animation
//         this._rankscroll.execute_animation();
//     }
//
//     /*override*/
//     protected on_resize(): void {
//         this.draw_background();
//         this.do_layout();
//     }
//
//     private draw_background(): void {
//         this.graphics.clear();
//         this.graphics.beginFill(0x0, 0.05);
//         this.graphics.drawRect(0, 0, this._offscreen_width, this._offscreen_height);
//         this.graphics.endFill();
//
//         if (this._rankscroll != null) {
//             this.graphics.beginFill(0x0, 0.8);
//             this.graphics.drawRect(this._offscreen_width - this._rankscroll.width, 0, this._rankscroll.width, this._offscreen_height);
//             this.graphics.endFill();
//         }
//     }
//
//     private next_puzzle(): void {
//         if (this._next_cb != null) {
//             this._next_cb();
//         }
//     }
//
//     private close_dialog(): void {
//         if (this._close_cb != null) {
//             this._close_cb();
//         }
//     }
//
//     private do_layout(): void {
//         let margin: number = 25;
//         let h_walker: number = 0;
//
//         this._panel.visible = (this._rankscroll != null);
//         this._closeButton.visible = this._panel.visible;
//         this._next_button.visible = this._panel.visible;
//         this._tfLoading.visible = !this._panel.visible;
//
//         this._title.set_pos(new UDim(0.5, 0, -this._title.text_width() / 2, h_walker));
//         h_walker += this._title.text_height() + margin;
//
//         if (this._rankscroll) {
//             this._info_text.set_autosize(false, false, this._rankscroll.width - 2 * margin);
//         }
//         this._info_text.set_pos(new UDim(0, 0, margin, h_walker));
//         h_walker += this._info_text.text_height() + margin;
//
//         if (this._science_text.visible) {
//             if (this._rankscroll) {
//                 let w: number = this._rankscroll.width - 2 * margin;
//                 this._science_text.set_autosize(false, false, w);
//             }
//             this._science_text.set_pos(new UDim(0, 0, margin, h_walker));
//             h_walker += this._science_text.text_height() + margin;
//         }
//
//         if (this._rankscroll) {
//             h_walker += margin - 15;
//
//             this._heading.set_size(new UDim(0, 0, 310, this._hdr_player.text_height()));
//             this._heading.set_pos(new UDim(0.5, 0, 10 - this._rankscroll.get_real_width() / 2, h_walker));
//             h_walker += 10 + this._hdr_player.text_height();
//
//             this._rankscroll.set_pos(new UDim(0.5, 0, 20 - this._rankscroll.get_real_width() / 2, h_walker));
//             h_walker += 88 + margin;
//         }
//
//         if (this._rankscroll) {
//             this._next_button.set_pos(new UDim(1.0, 1.0, -(this._rankscroll.width / 2) - this._next_button.button_width() / 2, -margin - this._next_button.button_height()));
//         } else {
//             this._next_button.set_pos(new UDim(1.0, 1.0, -40 - this._next_button.button_width() / 2, -margin - this._next_button.button_height()));
//         }
//         h_walker += this._next_button.button_height();
//
//         if (this._rankscroll) {
//             this._panel.set_size(new UDim(0, 0, this._rankscroll.width, h_walker));
//             this._panel.set_pos(new UDim(1.0, 0.5, -this._rankscroll.width, -h_walker / 2));
//         }
//
//         this._closeButton.set_pos(new UDim(1.0, 0.0, -10 - this._closeButton.button_width(), 10));
//
//     }
//
//     private static go_to_feed(): void {
//         let req: URLRequest = new URLRequest;
//         if (Application.instance.get_player_id() == 0) {
//             req.url = EternaURL.generate_url({"page": "register"});
//         } else {
//             req.url = EternaURL.generate_url({"page": "me"});
//         }
//         this.navigateToURL(req, "_self");
//     }
//
//     // Panel
//     private _panel: GamePanel;
//     // Texts
//     // private _tfLoading: Text;
//     private _title: Text;
//     private _info_text: Text;
//     private _science_text: Text;
//     // Buttons
//     private _next_button: GameButton;
//     private _closeButton: GameButton;
//     // Rank scroll
//     private _heading: GamePanel;
//     private _hdr_player: Text;
//     private _rankscroll: RankScroll;
//     // Callbacks
//     private _next_cb: Function;
//     private _close_cb: Function;
//
//     private static readonly WIDTH: number = 470;
// }
