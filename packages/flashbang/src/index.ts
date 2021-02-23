import {DisplayObject, Container} from "pixijs";

/** Core flashbang application */
export class FlashbangApp {}

/** Sub-application which flashbang can use as a high-level navigation and container primative */
export class AppMode {}

/** Core object managed by flashbang to handle lifetimes, tasks, etc */
export class GameObject {}

/** A GameObject that manages a PixiJS DisplayObject */
export class SceneObject<T extends DisplayObject = DisplayObject> extends GameObject {}

/** GameObject that manages a PixiJS Container */
export class ContainerObject extends SceneObject<Container> {}

/** Primative to construct a tree data structure */
export class TreeNode<T> {}
