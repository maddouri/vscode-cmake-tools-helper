# CMake Tools Helper

[![Version](http://vsmarketplacebadge.apphb.com/version/maddouri.cmake-tools-helper.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=maddouri.cmake-tools-helper) [![Installs](http://vsmarketplacebadge.apphb.com/installs/maddouri.cmake-tools-helper.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=maddouri.cmake-tools-helper) [![Ratings](https://vsmarketplacebadge.apphb.com/rating/maddouri.cmake-tools-helper.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=maddouri.cmake-tools-helper)

[![Dependencies Status](https://david-dm.org/maddouri/vscode-cmake-tools-helper/status.svg?style=flat-square)](https://david-dm.org/maddouri/vscode-cmake-tools-helper) [![DevDependencies Status](https://david-dm.org/maddouri/vscode-cmake-tools-helper/dev-status.svg?style=flat-square)](https://david-dm.org/maddouri/vscode-cmake-tools-helper?type=dev)


This extension helps to bridge a gap between 2 great extensions:

* [cpptools (`ms-vscode.cpptools`)](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) by Microsoft: Provides C and C++ language support (auto-completion, go to definition, etc.)
* [CMake Tools (`vector-of-bool.cmake-tools`)](https://marketplace.visualstudio.com/items?itemName=vector-of-bool.cmake-tools) by vector-of-bool: Provides support for CMake-based projects (configure, build, etc.)

[CMake Tools Helper](https://marketplace.visualstudio.com/items?itemName=maddouri.cmake-tools-helper) enables cpptools to **automatically** know the information parsed by CMake Tools (such as **include directories** and **defines**) and use it to provide auto-completion, go to definition, etc.

## Features

* Automatically updates cpptools' `c_cpp_properties.json` with the current CMake target's information (**build type**, **include directories** and **defines**)
* Automatically updates cpptools' active configuration to match CMake Tools' active configuration and target
* CMake downloader and version manager
    * Install any version of CMake from the confort or your favorite editor! (command `CMake: Install CMake`)
    * Multiple versions can be installed
    * You can switch between them at any time (command `CMake: Change CMake version`)
    * This extension can update CMake Tools' parameters (i.e. "CMake Path" and "Use CMake Server") after installing or changing the CMake version

## Prerequisites

* CMake Tools with `cmake.useCMakeServer` set to `true`
* cpptools (please note that **this extension has to overwrite the content of `c_cpp_properties.json`**)

## Why

In order to provide some its features, cpptools relies on a JSON file (`c_cpp_properties.json`) that contains project-related information such as include paths and defines.

At the same time, CMake Tools parses the project's CMake files and extracts all the information that is needed to build it (e.g. compiler flags, includes, defines, etc.) and stores it in another JSON file. (`.cmaketools.json`)

Currently, (I mean... before this extension was released :wink: ) there is no way for cpptools to automatically benefit from what CMake Tools knows -- i.e. The users have to manually copy the include paths and defines from their CMake files (or CMake Tools' `.cmaketools.json`) to `c_cpp_properties.json`.

Having found nothing to do the above automatically, I decided to create this extension!

Please note that discussions were started at https://github.com/vector-of-bool/vscode-cmake-tools/issues/22 and https://github.com/Microsoft/vscode-cpptools/issues/156 to try to address the issue, but AFAIK there is nothing concrete yet.


## How Does It Work

This extension's code is not too long to go over, but the short answer is: Ugly hacks, sweat and tears.

#### Getting the Information from CMake Tools

A combination of:

* `vscode.extensions.getExtension("vector-of-bool.cmake-tools").exports`: is the CMake Tools extension API. It allows getting the name of the currently-selected build target as well as the list of valid CMake configurations. Currently, CMake Tools provides 2 implementations:
    * legacy: compatible with CMake < 3.7.1 and does not use CMake Server. It does provide a per-file information (as opposed to per-targte compilation info)
    * client: compatibl with CMake >= 3.7.1 and uses CMake Server. It provides a "code model" that provides per-target compilation information

    CMake Tools Helper uses the "client" implementation and therefore requires the `cmake.useCMakeServer` setting to be `true`
* Event listeners: CMake Tools API >= 0.9.5 provides the following events:
    * reconfigured
    * targetChangedEvent

    CMake Tools Helper uses them in order to be notified when the configuration and/or the default build target changes

#### Mirroring the Information to cpptools

Each time CMake Tools Helper is notified, the following happens:

1. CMake Tools Helper
    1. Gets the current configuration and target name from CMake Tools
    2. **Overrides** the content of `c_cpp_properties.json` using the information from step 1
1. VSCode notifies cpptools that `c_cpp_properties.json` has changed (as of cpptools v0.11.2 has a file watcher on it)
1. cpptools:
    1. Parses `c_cpp_properties.json`
    1. Finds a single configuration (the one that mirrors CMake Tools' current configuration)
    1. Uses this configuration as the active one
    1. Generates all bells and whistles for your C or C++ project

## Limitations / Known Issues

1. In order force cpptools to use CMake Tools' current configuration, at any given point in time, only that configuration is present in `c_cpp_properties.json`. This is a workaround to the fact that cpptools doesn't export any API that other extensions could use to interact with it. This particular solution was inspired by the implementation of `handleConfigurationChange` (`ms-vscode.cpptools-0.11.2/out/src/LanguageServer/C_Cpp_ConfigurationProperties.js`)
1. CMake's extra targets (e.g. `all`, `clean`, `ALL_BUILD`, `ZERO_CHECK`, etc...) are not handled and selecting them results in a "null" configuration in `c_cpp_properties.json` (if you have ideas on what to do when those targets are selected, please feel free to open an issue on the repo, I'll see what I can do ;)
1. I use and test this extension exclusively in an up-to-date version of VSCode **Insiders**
