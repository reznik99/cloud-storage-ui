type IProps = {
    height?: number;
    width?: number;
};
export function Logo(props: IProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            width={props.width || 40}
            height={props.height || 40}
            style={{ animation: 'spinIn 1.5s ease-out' }}
        >
            <g fill="#009EFF">
                <path d="M256 32c-19 0-37 3-54 9 51 7 97 30 133 66 36 36 59 82 66 133 6-17 9-35 9-54 0-93-76-169-169-169zM256 480c19 0 37-3 54-9-51-7-97-30-133-66-36-36-59-82-66-133-6 17-9 35-9 54 0 93 76 169 169 169zM480 256c0-19-3-37-9-54-7 51-30 97-66 133-36 36-82 59-133 66 17 6 35 9 54 9 93 0 169-76 169-169zM32 256c0 19 3 37 9 54 7-51 30-97 66-133 36-36 82-59 133-66-17-6-35-9-54-9-93 0-169 76-169 169z" />
            </g>
        </svg>
    );
}
