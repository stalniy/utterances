import { User, Issue, IssueComment } from '../services/github';
import { CommentComponent } from './comment-component';

export class TimelineComponent {
  public readonly el: HTMLElement;
  private readonly _timeline: CommentComponent[] = [];
  private readonly countAnchor: HTMLAnchorElement;
  private readonly marker: Node;
  private count: number = 0;

  constructor(
    private user: User | null,
    private issue: Issue | null,
    private _currentUrl: string
  ) {
    this.el = document.createElement('main');
    this.el.classList.add('timeline');
    this.el.innerHTML = `
      <h1 class="timeline-header">
        <a class="text-link" target="_blank"></a>
      </h1>
    `.trim();
    this.countAnchor = this.el.firstElementChild!.firstElementChild as HTMLAnchorElement;
    this.marker = document.createComment('marker');
    this.el.appendChild(this.marker);
    this.setIssue(this.issue);
    this._renderCount();
  }

  public setUser(user: User | null) {
    this.user = user;
    const login = user ? user.login : null;
    for (let i = 0; i < this._timeline.length; i++) {
      this._timeline[i].setCurrentUser(login);
    }
  }

  public setIssue(issue: Issue | null) {
    this.issue = issue;
    if (issue) {
      this.count = issue.comments;
      this.countAnchor.href = issue.html_url;
      this._renderCount();
    } else {
      this.countAnchor.removeAttribute('href');
    }
  }

  public insertComment(comment: IssueComment, incrementCount: boolean) {
    const component = new CommentComponent(
      comment,
      this.user ? this.user.login : null,
      this.issue!.locked,
      this._currentUrl
    );

    const index = this._timeline.findIndex(x => x.comment.id >= comment.id);
    if (index === -1) {
      this._timeline.push(component);
      this.el.insertBefore(component.el, this.marker);
    } else {
      const next = this._timeline[index];
      const remove = next.comment.id === comment.id;
      this.el.insertBefore(component.el, next.el);
      this._timeline.splice(index, remove ? 1 : 0, component);
      if (remove) {
        next.el.remove();
      }
    }

    if (incrementCount) {
      this.count++;
      this._renderCount();
    }
  }

  public insertPageLoader(insertAfter: IssueComment, count: number, callback: () => void) {
    const comment = this._timeline.find(x => x.comment.id >= insertAfter.id)!;
    comment.el.insertAdjacentHTML('afterend', `
      <div class="page-loader">
        <div class="zigzag"></div>
        <button type="button" class="btn btn-outline btn-large">
          ${count} hidden items<br/>
          <span>Load more...</span>
        </button>
      </div>
    `);
    const element = comment.el.nextElementSibling!;
    const button = element.lastElementChild! as HTMLButtonElement;
    const statusSpan = button.lastElementChild!;
    button.onclick = callback;

    return {
      setBusy() {
        statusSpan.textContent = 'Loading...';
        button.disabled = true;
      },
      remove() {
        button.onclick = null;
        element.remove();
      }
    };
  }

  private _renderCount() {
    this.countAnchor.textContent = `${this.count} Comment${this.count === 1 ? '' : 's'}`;
  }
}
