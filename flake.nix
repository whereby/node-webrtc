{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = (pkgs.buildFHSEnv.override {
          stdenv = pkgs.gcc10Stdenv;
        } {
          name = "node-webrtc";
          targetPkgs = pkgs: (with pkgs; [
            cmake
            gcc10
            ninja
            nodejs_20
            pkg-config
            zlib
          ]);
        }).env;
      }
    );
}
