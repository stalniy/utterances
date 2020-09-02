import { CommentAuthorAssociation, IssueComment, reactionTypes } from '../services/github';
import { timeAgo } from '../time-ago';
import { getReactionsMenuHtml, getReactionHtml, getSignInToReactMenuHtml } from '../reactions';

const avatarArgs = '?v=3&s=88';
const displayAssociations: Record<CommentAuthorAssociation, string> = {
  COLLABORATOR: 'Collaborator',
  CONTRIBUTOR: 'Contributor',
  MEMBER: 'Member',
  OWNER: 'Owner',
  FIRST_TIME_CONTRIBUTOR: 'First time contributor',
  FIRST_TIMER: 'First timer',
  NONE: ''
};

export class CommentComponent {
  public readonly el: HTMLElement;
  private _currentUser: string | null;

  constructor(
    public comment: IssueComment,
    currentUser: string | null,
    locked: boolean,
    currentUrl: string,
  ) {
    this.el = document.createElement('article');
    this._currentUser = null;
    this.el.classList.add('timeline-comment');
    this._render(comment, locked, currentUrl);
    this.setCurrentUser(currentUser);

    const markdownBody = this.el.querySelector('.markdown-body')!;
    const emailToggle = markdownBody.querySelector('.email-hidden-toggle a') as HTMLAnchorElement;
    if (emailToggle) {
      const emailReply = markdownBody.querySelector('.email-hidden-reply') as HTMLDivElement;
      emailToggle.onclick = event => {
        event.preventDefault();
        emailReply.classList.toggle('expanded');
      };
    }

    processRenderedMarkdown(markdownBody);
  }

  private _render(comment: IssueComment, locked: boolean, currentUrl: string) {
    const { user, reactions } = comment;
    const association = displayAssociations[comment.author_association];
    const reactionCount = reactionTypes.reduce((sum, id) => sum + reactions[id], 0);
    const [headerReactionsMenu, footerReactionsMenu] = this._renderReactions(comment, locked, currentUrl);

    this.el.innerHTML = `
      <a class="avatar" href="${user.html_url}" target="_blank" tabindex="-1">
        <img alt="@${user.login}" height="44" width="44" src="${user.avatar_url}${avatarArgs}">
      </a>
      <div class="comment">
        <header class="comment-header">
          <span class="comment-meta">
            <a class="text-link" href="${user.html_url}" target="_blank"><strong>${user.login}</strong></a>
            commented
            <a class="text-link" href="${comment.html_url}" target="_blank">${timeAgo(Date.now(), new Date(comment.created_at))}</a>
          </span>
          <div class="comment-actions">
            ${association ? `<span class="author-association-badge">${association}</span>` : ''}
            ${headerReactionsMenu}
          </div>
        </header>
        <div class="markdown-body markdown-body-scrollable">
          ${comment.body_html}
        </div>
        <div class="comment-footer" reaction-count="${reactionCount}" reaction-url="${reactions.url}">
          <form class="reaction-list BtnGroup" action="javascript:">
            ${reactionTypes.map(id => getReactionHtml(reactions.url, id, !this._currentUser || locked, reactions[id])).join('')}
          </form>
          ${footerReactionsMenu}
        </div>
      </div>`;
  }

  private _renderReactions(comment: IssueComment, locked: boolean, currentUrl: string) {
    let headerReactionsMenu = '';
    let footerReactionsMenu = '';

    if (!locked) {
      if (this._currentUser) {
        headerReactionsMenu = getReactionsMenuHtml(comment.reactions.url, 'right');
        footerReactionsMenu = getReactionsMenuHtml(comment.reactions.url, 'center');
      } else {
        headerReactionsMenu = getSignInToReactMenuHtml('right', currentUrl);
        footerReactionsMenu = getSignInToReactMenuHtml('center', currentUrl);
      }
    }

    return [headerReactionsMenu, footerReactionsMenu];
  }

  public setCurrentUser(currentUser: string | null) {
    if (this._currentUser === currentUser) {
      return;
    }

    this._currentUser = currentUser;

    if (this.comment.user.login === currentUser) {
      this.el.classList.add('current-user');
    } else {
      this.el.classList.remove('current-user');
    }
  }
}

export function processRenderedMarkdown(markdownBody: Element) {
  Array.from(markdownBody.querySelectorAll<HTMLAnchorElement>(':not(.email-hidden-toggle) > a'))
    .forEach(a => { a.target = '_top'; a.rel = 'noopener noreferrer'; });
  Array.from(markdownBody.querySelectorAll<HTMLAnchorElement>('a.commit-tease-sha'))
    .forEach(a => a.href = 'https://github.com' + a.pathname);
}
