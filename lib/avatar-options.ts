export type AvatarOption = {
  id: string;
  name: string;
  src: string;
};

export const avatarOptions: AvatarOption[] = [
  { id: "orbit", name: "Orbit", src: "/img/avatars/orbit.svg" },
  { id: "bolt", name: "Bolt", src: "/img/avatars/bolt.svg" },
  { id: "nova", name: "Nova", src: "/img/avatars/nova.svg" },
  { id: "byte", name: "Byte", src: "/img/avatars/byte.svg" },
  { id: "pixel", name: "Pixel", src: "/img/avatars/pixel.svg" },
  { id: "zen", name: "Zen", src: "/img/avatars/zen.svg" },
];

export const defaultAvatar = avatarOptions[0];

export function getAvatarById(avatarId: string | null | undefined): AvatarOption {
  if (!avatarId) {
    return defaultAvatar;
  }

  return avatarOptions.find((item) => item.id === avatarId) ?? defaultAvatar;
}