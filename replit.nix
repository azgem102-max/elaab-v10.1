{pkgs}: {
  deps = [
    pkgs.pango
    pkgs.alsa-lib
    pkgs.gtk3
    pkgs.mesa
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libxcb
    pkgs.xorg.libX11
    pkgs.libdrm
    pkgs.expat
    pkgs.dbus
    pkgs.cups
    pkgs.at-spi2-atk
    pkgs.nss
    pkgs.glib
  ];
}
