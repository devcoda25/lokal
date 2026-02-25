/**
 * Type declarations for @babel/traverse
 * This file provides type definitions when the package's built-in types are not detected
 */

declare module '@babel/traverse' {
    import { Node as BabelNode } from '@babel/types';

    export interface NodePath<T = BabelNode> {
        node: T;
        parent: BabelNode | null;
        parentPath: NodePath | null;
        scope: Scope;
        hub: any;
        context: any;
        state: any;
        opts: any;

        get(key: string): any;
        pushContext(context: any): void;
        popContext(): void;
        call(callback: (path: NodePath) => void, key: string): void;
        isReferencedIdentifier(): boolean;
        isBindingIdentifier(): boolean;
        replaceWith(node: BabelNode | NodePath): void;
        remove(): void;
        find(callback: (path: NodePath) => boolean): NodePath | null;
        findParent(callback: (path: NodePath) => boolean): NodePath | null;
        traverse(visitors: Visitor<any>): void;
    }

    export interface Scope {
        parent: Scope | null;
        parentBlock: BabelNode;
        block: BabelNode;
        path: NodePath;
        references: Map<string, NodePath[]>;
        bindings: Map<string, Binding>;

        getBinding(name: string): Binding | undefined;
        hasBinding(name: string): boolean;
        getOwnBinding(name: string): Binding | undefined;
    }

    export interface Binding {
        kind: 'var' | 'let' | 'const' | 'module' | 'param' | 'local' | 'unknown';
        path: NodePath;
        scope: Scope;
        constant: boolean;
        constantViolations: NodePath[];
        referencers: NodePath[];
        references: number;
    }

    export interface Visitor<T> {
        [key: string]: (path: NodePath<T>, state: any) => void;
    }

    export interface TraverseOptions {
        scope?: boolean;
        pragma?: string;
        createParentMap?: boolean;
    }

    export default function traverse<S extends BabelNode = BabelNode>(
        parent: S,
        visitors: Visitor,
        scope?: Scope,
        state?: any,
        opts?: TraverseOptions
    ): void;

    export { BabelNode as Node };
}
