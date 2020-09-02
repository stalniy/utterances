import { User, renderMarkdown } from '../services/github';
import { processRenderedMarkdown } from './comment-component';
import { getLoginUrl } from '../oauth';

// tslint:disable-next-line:max-line-length
const anonymousAvatar = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 16" version="1.1"><path fill="rgb(179,179,179)" fill-rule="evenodd" d="M8 10.5L9 14H5l1-3.5L5.25 9h3.5L8 10.5zM10 6H4L2 7h10l-2-1zM9 2L7 3 5 2 4 5h6L9 2zm4.03 7.75L10 9l1 2-2 3h3.22c.45 0 .86-.31.97-.75l.56-2.28c.14-.53-.19-1.08-.72-1.22zM4 9l-3.03.75c-.53.14-.86.69-.72 1.22l.56 2.28c.11.44.52.75.97.75H5l-2-3 1-2z"></path></svg>`;
// base64 encoding works in IE, Edge. UTF-8 does not.
const anonymousAvatarUrl = `data:image/svg+xml;base64,${btoa(anonymousAvatar)}`;

const nothingToPreview = 'Nothing to preview';

function toggleVisibility(el: HTMLElement, isVisible: boolean) {
  el.style.display = isVisible ? '' : 'none';
}

export class NewCommentComponent {
  public readonly el: HTMLElement;

  private _avatarAnchor: HTMLAnchorElement;
  private _avatar: HTMLImageElement;
  private _form: HTMLFormElement;
  private _textarea: HTMLTextAreaElement;
  private _preview: HTMLDivElement;
  private _submitButton: HTMLButtonElement;
  private _signInAnchor: HTMLAnchorElement;

  private _submitting = false;
  private _previewTimerId = 0;
  private _user: User | null = null;

  constructor(
    user: User | null,
    private readonly _createComment: (markdown: string) => Promise<void>,
    private readonly _currentUrl: string
  ) {
    this.el = document.createElement('article');
    this.el.classList.add('timeline-comment');

    this.el.innerHTML = [
      '<a class="avatar" target="_blank" tabindex="-1">',
      '<img height="44" width="44">',
      '</a>',
      '<form class="comment">',
      '<header class="new-comment-header tabnav">',
      '<div class="tabnav-tabs" role="tablist">',
      '<button type="button" class="tabnav-tab tab-write" role="tab" aria-selected="true">',
      'Write',
      '</button>',
      '<button type="button" class="tabnav-tab tab-preview" role="tab">',
      'Preview',
      '</button>',
      '</div>',
      '</header>',
      '<div class="comment-body">',
      '<textarea class="form-control" placeholder="Leave a comment" aria-label="comment"></textarea>',
      '<div class="markdown-body" style="display: none">',
      nothingToPreview,
      '</div>',
      '</div>',
      '<footer class="new-comment-footer">',
      '<a class="text-link markdown-info" tabindex="-1" target="_blank" href="https://guides.github.com/features/mastering-markdown/">',
      '<svg class="octicon v-align-bottom" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true">',
      '<path fill-rule="evenodd" d="M14.85 3H1.15C.52 3 0 3.52 0 4.15v7.69C0 12.48.52 13 1.15 13h13.69c.64 0 1.15-.52 1.15-1.15v-7.7C16 3.52 15.48 3 14.85 3zM9 11H7V8L5.5 9.92 4 8v3H2V5h2l1.5 2L7 5h2v6zm2.99.5L9.5 8H11V5h2v3h1.5l-2.51 3.5z" />',
      '</svg>',
      'Styling with Markdown is supported',
      '</a>',
      '<button class="btn btn-primary" type="submit">Comment</button>',
      '<a class="btn btn-primary" href="', getLoginUrl(this._currentUrl), '" target="_top">Sign in to comment</a>',
      '</footer>',
      '</form>'
    ].join('');

    this._avatarAnchor = this.el.firstElementChild as HTMLAnchorElement;
    this._avatar = this._avatarAnchor.firstElementChild as HTMLImageElement;
    this._form = this._avatarAnchor.nextElementSibling as HTMLFormElement;
    this._textarea = this._form!.firstElementChild!.nextElementSibling!.firstElementChild as HTMLTextAreaElement;
    this._preview = this._form!.firstElementChild!.nextElementSibling!.lastElementChild as HTMLDivElement;
    this._signInAnchor = this._form!.lastElementChild!.lastElementChild! as HTMLAnchorElement;
    this._submitButton = this._signInAnchor.previousElementSibling! as HTMLButtonElement;

    this.setUser(user);
    this._submitButton.disabled = true;

    this._textarea.addEventListener('input', this.handleInput);
    this._form.addEventListener('submit', this._submit);
    this._form.addEventListener('click', this._switchTabs);
    this._form.addEventListener('keydown', this._submitOnEnter);
  }

  public setUser(user: User | null) {
    this._user = user;
    toggleVisibility(this._submitButton, !!user);
    toggleVisibility(this._submitButton, !user);

    if (user) {
      this._avatarAnchor.href = user.html_url;
      this._avatar.alt = '@' + user.login;
      this._avatar.src = user.avatar_url + '?v=3&s=88';
      this._textarea.disabled = false;
      this._textarea.placeholder = 'Leave a comment';
    } else {
      this._avatarAnchor.removeAttribute('href');
      this._avatar.alt = '@anonymous';
      this._avatar.src = anonymousAvatarUrl;
      this._textarea.disabled = true;
      this._textarea.placeholder = 'Sign in to comment';
    }
  }

  public clear() {
    this._textarea.value = '';
  }

  private handleInput = () => {
    const text = this._textarea.value.trim();
    this._submitButton.disabled = !text;
  }

  private _switchTabs = (event: Event) => {
    const button = event.target as HTMLButtonElement;

    if (button.classList.contains('tabnav-tab')) {
      this._selectTab(button);
    }
  }

  private _submitOnEnter = (event: KeyboardEvent) => {
    if (event.which === 13 && event.ctrlKey && !this._submitButton.disabled) {
      this._submitComment();
    }
  }

  private _submit = (event: Event) => {
    event.preventDefault();
    this._submitComment();
  }

  private _submitComment() {
    if (this._submitting) {
      return Promise.resolve();
    }
    this._submitting = true;
    this._textarea.disabled = true;
    this._submitButton.disabled = true;

    return this._createComment(this._textarea.value)
      .catch(() => 0)
      .then(() => {
        this._submitting = false;
        this._textarea.disabled = !this._user;
        this._textarea.value = '';
        this._submitButton.disabled = false;
        this._selectTab(this._form.querySelector('.tabnav-tab.tab-write')!);
        this._preview.textContent = nothingToPreview;
      });
  }

  private _selectTab(target: Element) {
    if (target.getAttribute('aria-selected') === 'true') {
      return;
    }

    target.parentNode!.querySelector('.tabnav-tab[aria-selected="true"]')!
      .setAttribute('aria-selected', 'false');
    target.setAttribute('aria-selected', 'true');
    const isPreview = target.classList.contains('tab-preview');
    toggleVisibility(this._textarea, !isPreview);
    toggleVisibility(this._preview, isPreview);

    if (isPreview) {
      this._renderPreview();
    } else {
      clearTimeout(this._previewTimerId);
    }
  }

  private _renderPreview() {
    const text = this._textarea.value.trim();

    if (text) {
      this._preview.textContent = 'Loading preview...';
      this._previewTimerId = setTimeout(() => renderMarkdown(text)
        .then(html => this._preview.innerHTML = html)
        .then(() => processRenderedMarkdown(this._preview)),
        500);
    } else {
      this._preview.textContent = nothingToPreview;
    }
  }
}
