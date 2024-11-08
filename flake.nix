{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        lib = nixpkgs.lib;
      in
      # if lib.strings.hasSuffix system "darwin" then
      {
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            cmake
            clang
            clang-tools
            ninja
            nodejs_20
            pkg-config
            xcbuild
            xcodes
            zlib
          ];
        };
      }
      # else
      # {
      #   devShells.default = (pkgs.buildFHSEnv.override {
      #     stdenv = pkgs.gcc10Stdenv;
      #   } {
      #     name = "node-webrtc";
      #     targetPkgs = pkgs: (with pkgs; [
      #       cmake
      #       gcc10
      #       ninja
      #       nodejs_20
      #       pkg-config
      #       zlib
      #     ]);
      #   }).env;
      # }
    );
}
