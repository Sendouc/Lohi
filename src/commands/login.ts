import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandInteraction, User } from "discord.js";
import ids from "../ids";
import type { BotCommand } from "../types";
import { patronsFiveDollarsAndOver, sendouInkFetch } from "../utils";

const LOGIN_COMMAND_NAME = "login";
const UPDATE_PROFILE_COMMAND_NAME = "update-profile";

export const loginCommand: BotCommand = {
  guilds: [ids.guilds.plusServer, ids.guilds.sendou],
  name: LOGIN_COMMAND_NAME,
  builder: new SlashCommandBuilder()
    .setName(LOGIN_COMMAND_NAME)
    .setDescription("Get log in link for sendou.ink"),
  execute: async ({ interaction }) => {
    await execute(interaction, false);
  },
};

export const updateProfileCommand: BotCommand = {
  guilds: [ids.guilds.plusServer, ids.guilds.sendou],
  name: UPDATE_PROFILE_COMMAND_NAME,
  builder: new SlashCommandBuilder()
    .setName(UPDATE_PROFILE_COMMAND_NAME)
    .setDescription("Update your username and profile picture on sendou.ink"),
  execute: async ({ interaction }) => {
    await execute(interaction, true);
  },
};

async function execute(
  interaction: CommandInteraction<any>,
  updateOnly: boolean,
) {
  const user = interaction.member?.user as User;
  if (!user) {
    return interaction.reply({
      content: "Something went wrong",
    });
  }

  if (!updateOnly) {
    const patrons = await patronsFiveDollarsAndOver();

    if (!patrons.some((p) => p.discordId === interaction.user.id)) {
      return interaction.reply({
        content:
          "This command is only available to patrons of 'Supporter' tier or higher https://www.patreon.com/sendou",
        ephemeral: true,
      });
    }
  }

  const hasUniqueUsername = user.discriminator === "0";
  const discordName = user.globalName ?? user.username;
  const discordUniqueName = user.username;

  if (!hasUniqueUsername) {
    return interaction.reply({
      content:
        "Can't do this with an account that is missing the new kind of Discord username",
      ephemeral: true,
    });
  }

  const searchParams = new URLSearchParams(
    user.avatar
      ? {
          discordAvatar: user.avatar,
          discordId: user.id,
          discordName,
          discordUniqueName,
          updateOnly: String(updateOnly),
        }
      : {
          discordId: user.id,
          discordName,
          discordUniqueName,
          updateOnly: String(updateOnly),
        },
  );

  const response = await sendouInkFetch(`/auth/create-link?${searchParams}`, {
    method: "post",
  });

  if (!response.ok) {
    return interaction.reply({
      content: "Having problems reaching sendou.ink, please try again later",
      ephemeral: true,
    });
  }

  if (updateOnly) {
    return interaction.reply({
      content: "Updated your profile on sendou.ink",
      ephemeral: true,
    });
  }

  const { code } = await response.json();

  return interaction.reply({
    content: `Use the link below to log in to sendou.ink. It's active for 10 minutes. ⚠️ Don't share this link with others as it will allow them to log in to your account.\n\n[log in link](https://sendou.ink/auth/login?code=${code})`,
    ephemeral: true,
  });
}
