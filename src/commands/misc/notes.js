/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const {
  Client,
  Interaction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const Notes = require("../../models/Notes");

const NOTES_PER_PAGE = 1;
const MAX_EMBED_LENGTH = 4096;

const createMainEmbed = (interaction, notesObjArr) => {
  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle(`${interaction.user.displayName}'s notepad`)
    .setTimestamp()
    .setFooter({
      text: `${interaction.user.displayName}'s notes`,
      iconURL: interaction.user.avatarURL(),
    });

  if (notesObjArr.length === 0) {
    embed.setDescription("No notes yet");
  } else {
    const notesList = notesObjArr
      .map((note, i) => `**${i + 1}.** ${note.title}`)
      .join("\n");
    embed.setDescription(notesList);
  }

  return embed;
};

const createNoteEmbed = (interaction, note, page, totalPages) => {
  const embed = new EmbedBuilder()
    .setColor("Blurple")
    .setTitle(note.title)
    .setTimestamp()
    .setFooter({
      text: `Page ${page + 1}/${totalPages} • ${interaction.user.displayName}'s notes`,
      iconURL: interaction.user.avatarURL(),
    });

  return embed;
};

const chunkText = (text, maxLength) => {
  const chunks = [];
  let currentChunk = "";

  const lines = text.split("\n");

  for (const line of lines) {
    if ((currentChunk + line + "\n").length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());

      if (line.length > maxLength) {
        let remainingLine = line;
        while (remainingLine.length > 0) {
          chunks.push(remainingLine.slice(0, maxLength));
          remainingLine = remainingLine.slice(maxLength);
        }
        currentChunk = "";
      } else {
        currentChunk = line + "\n";
      }
    } else {
      currentChunk += line + "\n";
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());

  return chunks.length > 0 ? chunks : [""];
};

const createMainComponents = (notesObjArr) => {
  const components = [];

  const addButton = new ButtonBuilder()
    .setCustomId("notes-create")
    .setLabel("Add new note")
    .setStyle(ButtonStyle.Primary);

  if (notesObjArr.length > 0) {
    const notesListMenu = new StringSelectMenuBuilder()
      .setCustomId("notes-list-menu")
      .setMaxValues(1)
      .setMinValues(1)
      .setPlaceholder("Select a note to view")
      .addOptions(
        notesObjArr.map((note, i) => ({
          label: note.title.slice(0, 100),
          value: i.toString(),
        })),
      );

    components.push(
      new ActionRowBuilder().addComponents(notesListMenu),
      new ActionRowBuilder().addComponents(addButton),
    );
  } else {
    components.push(new ActionRowBuilder().addComponents(addButton));
  }

  return components;
};

const createNoteViewComponents = (noteIndex, currentPage, totalPages) => {
  const backButton = new ButtonBuilder()
    .setCustomId("notes-back")
    .setLabel("Back")
    .setStyle(ButtonStyle.Secondary);

  const editButton = new ButtonBuilder()
    .setCustomId(`notes-edit-${noteIndex}`)
    .setLabel("Edit")
    .setStyle(ButtonStyle.Primary);

  const deleteButton = new ButtonBuilder()
    .setCustomId(`notes-delete-${noteIndex}`)
    .setLabel("Delete")
    .setStyle(ButtonStyle.Danger);

  const components = [];

  if (totalPages > 1) {
    const prevButton = new ButtonBuilder()
      .setCustomId(`notes-prev-${noteIndex}-${currentPage}`)
      .setLabel("◀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0);

    const nextButton = new ButtonBuilder()
      .setCustomId(`notes-next-${noteIndex}-${currentPage}`)
      .setLabel("▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1);

    components.push(
      new ActionRowBuilder().addComponents(prevButton, nextButton),
      new ActionRowBuilder().addComponents(
        backButton,
        editButton,
        deleteButton,
      ),
    );
  } else {
    components.push(
      new ActionRowBuilder().addComponents(
        backButton,
        editButton,
        deleteButton,
      ),
    );
  }

  return components;
};

const handleNotes = async (client, interaction) => {
  try {
    const query = {
      guildId: interaction.guild.id,
      userId: interaction.user.id,
    };
    let userNotes = await Notes.findOne(query);

    if (!userNotes) {
      userNotes = new Notes(query);
      await userNotes.save();
    }

    const mainEmbed = createMainEmbed(interaction, userNotes.notes);
    const mainComponents = createMainComponents(userNotes.notes);

    const reply = await interaction.reply({
      embeds: [mainEmbed],
      components: mainComponents,
      fetchReply: true,
    });

    const collector = reply.createMessageComponentCollector({
      time: 600000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "These are not your notes!",
          ephemeral: true,
        });
      }

      if (i.customId === "notes-create") {
        const modal = new ModalBuilder()
          .setCustomId("notes-create-modal")
          .setTitle("Create New Note");

        const titleInput = new TextInputBuilder()
          .setCustomId("note-title")
          .setLabel("Note Title")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true);

        const noteInput = new TextInputBuilder()
          .setCustomId("note-content")
          .setLabel("Note Content")
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(4000)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(noteInput),
        );

        await i.showModal(modal);

        try {
          const modalSubmit = await i.awaitModalSubmit({
            time: 300000,
            filter: (mInteraction) =>
              mInteraction.customId === "notes-create-modal" &&
              mInteraction.user.id === i.user.id,
          });

          const title = modalSubmit.fields.getTextInputValue("note-title");
          const content = modalSubmit.fields.getTextInputValue("note-content");

          userNotes.notes.push({ title, note: content });
          await userNotes.save();

          const updatedEmbed = createMainEmbed(interaction, userNotes.notes);
          const updatedComponents = createMainComponents(userNotes.notes);

          await modalSubmit.update({
            embeds: [updatedEmbed],
            components: updatedComponents,
          });
        } catch (error) {
          console.log("Modal timeout or error:", error.message);
        }
      } else if (i.customId === "notes-list-menu") {
        const selectedIndex = parseInt(i.values[0]);
        const selectedNote = userNotes.notes[selectedIndex];

        const chunks = chunkText(selectedNote.note, MAX_EMBED_LENGTH);
        const currentPage = 0;

        const noteEmbed = createNoteEmbed(
          interaction,
          selectedNote,
          currentPage,
          chunks.length,
        );
        noteEmbed.setDescription(chunks[currentPage]);

        const noteComponents = createNoteViewComponents(
          selectedIndex,
          currentPage,
          chunks.length,
        );

        await i.update({
          embeds: [noteEmbed],
          components: noteComponents,
        });
      } else if (i.customId === "notes-back") {
        userNotes = await Notes.findOne(query);
        const mainEmbed = createMainEmbed(interaction, userNotes.notes);
        const mainComponents = createMainComponents(userNotes.notes);

        await i.update({
          embeds: [mainEmbed],
          components: mainComponents,
        });
      } else if (i.customId.startsWith("notes-prev-")) {
        const [_, __, noteIndex, currentPage] = i.customId.split("-");
        const noteIdx = parseInt(noteIndex);
        const page = parseInt(currentPage);
        const newPage = page - 1;

        const selectedNote = userNotes.notes[noteIdx];
        const chunks = chunkText(selectedNote.note, MAX_EMBED_LENGTH);

        const noteEmbed = createNoteEmbed(
          interaction,
          selectedNote,
          newPage,
          chunks.length,
        );
        noteEmbed.setDescription(chunks[newPage]);

        const noteComponents = createNoteViewComponents(
          noteIdx,
          newPage,
          chunks.length,
        );

        await i.update({
          embeds: [noteEmbed],
          components: noteComponents,
        });
      } else if (i.customId.startsWith("notes-next-")) {
        const [_, __, noteIndex, currentPage] = i.customId.split("-");
        const noteIdx = parseInt(noteIndex);
        const page = parseInt(currentPage);
        const newPage = page + 1;

        const selectedNote = userNotes.notes[noteIdx];
        const chunks = chunkText(selectedNote.note, MAX_EMBED_LENGTH);

        const noteEmbed = createNoteEmbed(
          interaction,
          selectedNote,
          newPage,
          chunks.length,
        );
        noteEmbed.setDescription(chunks[newPage]);

        const noteComponents = createNoteViewComponents(
          noteIdx,
          newPage,
          chunks.length,
        );

        await i.update({
          embeds: [noteEmbed],
          components: noteComponents,
        });
      } else if (i.customId.startsWith("notes-edit-")) {
        const noteIndex = parseInt(i.customId.split("-")[2]);
        const selectedNote = userNotes.notes[noteIndex];

        const modal = new ModalBuilder()
          .setCustomId(`notes-edit-modal-${noteIndex}`)
          .setTitle("Edit Note");

        const titleInput = new TextInputBuilder()
          .setCustomId("note-title")
          .setLabel("Note Title")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setValue(selectedNote.title)
          .setRequired(true);

        const noteInput = new TextInputBuilder()
          .setCustomId("note-content")
          .setLabel("Note Content")
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(4000)
          .setValue(selectedNote.note)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(noteInput),
        );

        await i.showModal(modal);

        try {
          const modalSubmit = await i.awaitModalSubmit({
            time: 300000,
            filter: (mInteraction) =>
              mInteraction.customId === `notes-edit-modal-${noteIndex}` &&
              mInteraction.user.id === i.user.id,
          });

          const title = modalSubmit.fields.getTextInputValue("note-title");
          const content = modalSubmit.fields.getTextInputValue("note-content");

          userNotes.notes[noteIndex].title = title;
          userNotes.notes[noteIndex].note = content;
          await userNotes.save();

          const chunks = chunkText(content, MAX_EMBED_LENGTH);
          const currentPage = 0;

          const noteEmbed = createNoteEmbed(
            interaction,
            userNotes.notes[noteIndex],
            currentPage,
            chunks.length,
          );
          noteEmbed.setDescription(chunks[currentPage]);

          const noteComponents = createNoteViewComponents(
            noteIndex,
            currentPage,
            chunks.length,
          );

          await modalSubmit.update({
            embeds: [noteEmbed],
            components: noteComponents,
          });
        } catch (error) {
          console.log("Modal timeout or error:", error.message);
        }
      } else if (i.customId.startsWith("notes-delete-")) {
        const noteIndex = parseInt(i.customId.split("-")[2]);

        userNotes.notes.splice(noteIndex, 1);
        await userNotes.save();

        const mainEmbed = createMainEmbed(interaction, userNotes.notes);
        const mainComponents = createMainComponents(userNotes.notes);

        await i.update({
          embeds: [mainEmbed],
          components: mainComponents,
        });
      }
    });

    collector.on("end", () => {
      const disabledComponents = mainComponents.map((row) => {
        const newRow = ActionRowBuilder.from(row);
        newRow.components.forEach((component) => component.setDisabled(true));
        return newRow;
      });

      interaction.editReply({ components: disabledComponents }).catch(() => {});
    });
  } catch (error) {
    console.log(error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "An error occurred while processing your notes.",
        ephemeral: true,
      });
    }
  }
};

module.exports = {
  name: "notes",
  description: "Create, view, and manage your personal notes",
  options: [],
  cooldown: 5000,
  serverSpecific: true,
  callback: handleNotes,
};
