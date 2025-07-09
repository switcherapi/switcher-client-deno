FROM denoland/deno:2.4.1

# Install tools
RUN apt-get update && \
    apt-get install -y git && \
    rm -rf /var/lib/apt/lists/*

# Creates a non-root user for the devcontainer
ARG USERNAME=developer
ARG USER_UID=1000
ARG USER_GID=$USER_UID
RUN groupadd --gid "$USER_GID" "$USERNAME" \
    && useradd -s /bin/bash --uid "$USER_UID" --gid "$USER_GID" -m "$USERNAME" \
    && mkdir -p /home/"$USERNAME"/.deno \
    && chown -R "$USERNAME":"$USERNAME" /home/"$USERNAME" \
    && chown -R "$USERNAME":"$USERNAME" /deno-dir

# Switch to the non-root user
USER $USERNAME

# Set the working directory
WORKDIR /home/$USERNAME/workspace