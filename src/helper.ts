'use strict';

import * as vscode from 'vscode';
import * as path from 'path';

export function makeConfigName(projectName: string, targetName: string, buildTypeName: string): string {
    if (projectName == null || targetName == null || buildTypeName == null) {
        return 'null';
    }
    else {
        return `${projectName} / ${targetName} / ${buildTypeName}`;
    }
}

export function vscodeFolderPath(): string {
    return path.join(vscode.workspace.rootPath || '~', '.vscode');
}