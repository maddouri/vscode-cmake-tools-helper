'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as github from 'github';
import * as os from 'os';
import * as download from 'download';

export function cmakeArchBits(): number {
    const archName = os.arch();
    switch (archName) {
        case 'x64':
            return 64;
        case 'x32':
            return 32;
        case 'x86':
            return 32;
    }
}

// @return ['exact platform name', 'fallback name 1', 'fallback name 2']
export function cmakePlatformName(): string[] {
    const archBits = cmakeArchBits();
    const osName   = os.type();
    switch (osName) {
        case 'Linux':
            if (archBits == 64) {
                return ['Linux-x86_64', 'Linux-i386'];
            } else {
                return ['Linux-i386'];
            }

        case 'Darwin':
            if (archBits == 64) {
                return ['Darwin-x86_64', 'Darwin64-universal', 'Darwin-universal'];
            } else {
                return ['Darwin-universal'];
            }

        case 'Windows_NT':
            if (archBits == 64) {
                return ['win64-x64', 'win32-x86'];
            } else {
                return ['win32-x86'];
            }

        default:
            throw 'Unsupported OS [' + osName + ']';
    }
}

export function cmakePlatformExtension(): string {
    const osName   = os.type();
    switch (osName) {
        case 'Linux':
            return '.tar.gz';

        case 'Darwin':
            return '.tar.gz';

        case 'Windows_NT':
            return '.zip';

        default:
            throw 'Unsupported OS [' + osName + ']';
    }
}

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

export function getRemoteCMakeVersionNames(onReceivedTagsCB) {
    let ghClient = new github({
        headers: {
            // https://developer.github.com/v3/#user-agent-required
            'user-agent': 'vscode'
            //, 'Authorization': 'token MY_SECRET_TOKEN'  // TODO remove me
        }
    });

    let tags: string[] = [];

    const getTags = (err, res) => {
        if (err) {
            return false;
        }

        Array.prototype.push.apply(tags, res.data.map(t => t.ref));
        if (ghClient.hasNextPage(res)) {
            ghClient.getNextPage(res, (err, res) => { return getTags(err, res); })
        } else {
            onReceivedTagsCB(tags.map(t => t.replace('refs/tags/', '')));
        }
    }

    ghClient.gitdata.getTags({
            owner: 'Kitware',
            repo: 'CMake'
        },
        (err, res) => {
            getTags(err, res);
        }
    );
}

export async function downloadAndInstallCMake(versionName: string): Promise<string> {
    const versionNumber  = versionName.replace(/^v/, '');
    const versionArray   = versionNumber.split('.');
    const versionMajor   = versionArray[0];
    const versionMinor   = versionArray[1];
    const versionDirUrl  = `http://cmake.org/files/v${versionMajor}.${versionMinor}/`;

    const fileNameBase = `cmake-${versionNumber}-`;
    let   platformName = cmakePlatformName();
    const extension    = cmakePlatformExtension();

    const downloadPath = vscode.workspace.getConfiguration('cmake-tools-helper').get<string>('cmake_download_path').replace(/[\/\\]+$/, '');

    const makeFileUrl = pltfrmNm => `${versionDirUrl}${fileNameBase}${pltfrmNm}${extension}`;

    let extractionPath = null;
    while (platformName.length > 0) {
        const fileUrl = makeFileUrl(platformName[0]);

        try {
            const tryMsg = `Trying to download ${fileUrl}`;
            console.log(tryMsg);
            vscode.window.showInformationMessage(tryMsg);

            const res = await download(fileUrl, downloadPath, { extract: true });
            if (res != null) {
                const extractionDir = res[0].path.split(/[\/\\]/)[0];  // keep only the first "component" of the path
                extractionPath = `${downloadPath}${path.sep}${extractionDir}`;

                const okMsg = `Download finished. Files extracted in ${extractionPath}`;
                console.log(okMsg);
                vscode.window.showInformationMessage(okMsg);
            }
            break;
        } catch (e) {
            const errMsg = `Failed to download ${fileUrl}. ${e}`;
            console.error(errMsg);
            vscode.window.showErrorMessage(errMsg);
            platformName.shift();
        }
    }

    return new Promise<string>((resolve, reject) => {
        resolve(extractionPath);
    });

}